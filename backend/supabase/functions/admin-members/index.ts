import { assertTrustedOrigin, corsHeaders, HttpError, json } from "../_shared/http.ts";
import { requireAdmin } from "../_shared/supabase.ts";

type MemberAction = "password-reset" | "resend-confirmation" | "block" | "unblock" | "remove";

class ActionError extends HttpError {
  constructor(message: string, readonly code: string, status = 400) {
    super(message, status);
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedActions = new Set<MemberAction>([
  "password-reset",
  "resend-confirmation",
  "block",
  "unblock",
  "remove",
]);

function siteUrl(path: string): string {
  return `${(Deno.env.get("SITE_URL") ?? "https://wineandchapters.co.za").replace(/\/$/, "")}${path}`;
}

function statusFor(member: { email_verified: boolean; blocked: boolean; deleted_at: string | null }) {
  if (member.deleted_at) return "REMOVED";
  if (member.blocked) return "BLOCKED";
  return member.email_verified ? "VERIFIED" : "UNVERIFIED";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST")
    return json(request, { code: "METHOD_NOT_ALLOWED", message: "Method not allowed." }, 405);

  let audit:
    | {
        client: ReturnType<typeof import("../_shared/supabase.ts").serviceClient>;
        actorId: string;
        targetId: string | null;
        targetEmail: string | null;
        action: string;
      }
    | undefined;

  try {
    assertTrustedOrigin(request);
    const { client, member: actor } = await requireAdmin(request);
    const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const action = payload?.action;
    const targetUserId = payload?.targetUserId;

    audit = {
      client,
      actorId: actor.id,
      targetId: null,
      targetEmail: null,
      action:
        typeof action === "string" && allowedActions.has(action as MemberAction) ? action : "invalid",
    };

    if (typeof action !== "string" || !allowedActions.has(action as MemberAction))
      throw new ActionError("Unsupported member action.", "INVALID_ACTION");
    if (typeof targetUserId !== "string" || !uuidPattern.test(targetUserId))
      throw new ActionError("A valid target user ID is required.", "INVALID_TARGET");

    const { data: target, error: targetError } = await client
      .from("users")
      .select("id,auth_user_id,email,role,email_verified,blocked,deleted_at")
      .eq("id", targetUserId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target || target.deleted_at)
      throw new ActionError("Member not found.", "MEMBER_NOT_FOUND", 404);

    audit.targetId = target.id;
    audit.targetEmail = target.email;
    if (!target.auth_user_id)
      throw new ActionError("This member no longer has an authentication account.", "AUTH_ACCOUNT_NOT_FOUND", 409);
    if ((action === "block" || action === "remove") && target.id === actor.id)
      throw new ActionError(`Administrators cannot ${action} themselves.`, "SELF_PROTECTION", 409);

    if (
      (action === "block" || action === "remove") &&
      target.role === "ADMIN" &&
      target.email_verified &&
      !target.blocked
    ) {
      const { count, error: countError } = await client
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "ADMIN")
        .eq("email_verified", true)
        .eq("blocked", false)
        .is("deleted_at", null);
      if (countError) throw countError;
      if ((count ?? 0) <= 1)
        throw new ActionError(
          "The last active administrator cannot be blocked or removed.",
          "LAST_ADMIN_PROTECTED",
          409,
        );
    }

    const { data: authTarget, error: authTargetError } = await client.auth.admin.getUserById(
      target.auth_user_id,
    );
    if (authTargetError || !authTarget.user)
      throw new ActionError("Authentication account not found.", "AUTH_ACCOUNT_NOT_FOUND", 404);
    const targetEmail = authTarget.user.email ?? target.email;

    if (action === "password-reset") {
      if (target.blocked)
        throw new ActionError("Unblock this member before sending a reset link.", "MEMBER_BLOCKED", 409);
      const { error } = await client.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: siteUrl("/reset-password"),
      });
      if (error) throw new ActionError("Password-reset email could not be sent.", "RESET_DELIVERY_FAILED", 502);
    } else if (action === "resend-confirmation") {
      if (target.email_verified || authTarget.user.email_confirmed_at)
        throw new ActionError("This member's email is already verified.", "ALREADY_VERIFIED", 409);
      const { error } = await client.auth.resend({
        type: "signup",
        email: targetEmail,
        options: { emailRedirectTo: siteUrl("/verify-email") },
      });
      if (error)
        throw new ActionError("Confirmation email could not be resent.", "CONFIRMATION_DELIVERY_FAILED", 502);
    } else if (action === "block") {
      const wasBlocked = target.blocked;
      const { error: stateError } = await client.rpc("admin_set_member_blocked", {
        actor_user_id: actor.id,
        member_id: target.id,
        new_blocked: true,
      });
      if (stateError) {
        if (stateError.message.includes("last active administrator"))
          throw new ActionError(stateError.message, "LAST_ADMIN_PROTECTED", 409);
        if (stateError.message.includes("themselves"))
          throw new ActionError(stateError.message, "SELF_PROTECTION", 409);
        throw stateError;
      }
      const { error: authError } = await client.auth.admin.updateUserById(target.auth_user_id, {
        ban_duration: "876000h",
      });
      if (authError) {
        if (!wasBlocked)
          await client.rpc("admin_set_member_blocked", {
            actor_user_id: actor.id,
            member_id: target.id,
            new_blocked: false,
          });
        throw new ActionError("Member could not be blocked.", "AUTH_BLOCK_FAILED", 502);
      }
      target.blocked = true;
    } else if (action === "unblock") {
      const wasBlocked = target.blocked;
      const { error: stateError } = await client.rpc("admin_set_member_blocked", {
        actor_user_id: actor.id,
        member_id: target.id,
        new_blocked: false,
      });
      if (stateError) throw stateError;
      const { error: authError } = await client.auth.admin.updateUserById(target.auth_user_id, {
        ban_duration: "none",
      });
      if (authError) {
        if (wasBlocked)
          await client.rpc("admin_set_member_blocked", {
            actor_user_id: actor.id,
            member_id: target.id,
            new_blocked: true,
          });
        throw new ActionError("Member could not be unblocked.", "AUTH_UNBLOCK_FAILED", 502);
      }
      target.blocked = false;
    } else {
      if (payload?.confirmation !== "REMOVE")
        throw new ActionError("Removal requires confirmation value REMOVE.", "REMOVAL_CONFIRMATION_REQUIRED", 409);

      const wasBlocked = target.blocked;
      const { error: stateError } = await client.rpc("admin_set_member_blocked", {
        actor_user_id: actor.id,
        member_id: target.id,
        new_blocked: true,
      });
      if (stateError) {
        if (stateError.message.includes("last active administrator"))
          throw new ActionError(stateError.message, "LAST_ADMIN_PROTECTED", 409);
        throw stateError;
      }
      const { error: authDeleteError } = await client.auth.admin.deleteUser(target.auth_user_id);
      if (authDeleteError) {
        if (!wasBlocked)
          await client.rpc("admin_set_member_blocked", {
            actor_user_id: actor.id,
            member_id: target.id,
            new_blocked: false,
          });
        throw new ActionError("Authentication account could not be removed.", "AUTH_DELETE_FAILED", 502);
      }

      const anonymizedEmail = `former-${target.id}@removed.invalid`;
      const { error: userError } = await client
        .from("users")
        .update({
          auth_user_id: null,
          email: anonymizedEmail,
          first_name: "Former",
          last_name: "member",
          region: null,
          instagram: null,
          role: "MEMBER",
          email_verified: false,
          approved: true,
          blocked: true,
          blocked_at: new Date().toISOString(),
          deleted_at: new Date().toISOString(),
        })
        .eq("id", target.id);
      if (userError) throw userError;
      const { error: profileError } = await client
        .from("profiles")
        .update({
          display_name: "Former member",
          avatar_url: null,
          bio: null,
          favourite_book: null,
          favourite_genres: [],
          profile_visibility: "PRIVATE",
        })
        .eq("user_id", target.id);
      if (profileError) throw profileError;
      target.deleted_at = new Date().toISOString();
      target.blocked = true;
      target.role = "MEMBER";
      target.email_verified = false;
    }

    const { error: auditError } = await client.from("audit_logs").insert({
      actor_id: actor.id,
      target_user_id: target.id,
      target_email: audit.targetEmail,
      action: `MEMBER_${action.toUpperCase().replaceAll("-", "_")}`,
      entity_type: "user",
      entity_id: target.id,
      success: true,
      metadata: { action },
    });
    if (auditError) {
      console.error("Admin member action succeeded but audit persistence failed.", {
        errorType: typeof auditError,
      });
    }

    return json(request, {
      success: true,
      action,
      member: {
        id: target.id,
        role: target.role,
        verified: target.email_verified,
        blocked: target.blocked,
        status: statusFor(target),
      },
    });
  } catch (error) {
    const code =
      error instanceof ActionError
        ? error.code
        : error instanceof HttpError && error.message === "Origin not allowed."
          ? "ORIGIN_NOT_ALLOWED"
        : error instanceof HttpError && error.status === 401
          ? "AUTH_REQUIRED"
          : error instanceof HttpError && error.status === 403
            ? "ADMIN_REQUIRED"
            : "INTERNAL_ERROR";
    if (audit) {
      await audit.client.from("audit_logs").insert({
        actor_id: audit.actorId,
        target_user_id: audit.targetId,
        target_email: audit.targetEmail,
        action: `MEMBER_${audit.action.toUpperCase().replaceAll("-", "_")}`,
        entity_type: "user",
        entity_id: audit.targetId,
        success: false,
        error_code: code,
        metadata: { action: audit.action },
      });
    }
    const status = error instanceof HttpError ? error.status : 500;
    const message = error instanceof HttpError ? error.message : "Something went wrong.";
    console.error("Admin member action failed.", {
      status,
      code,
      errorType: error instanceof Error ? error.name : typeof error,
    });
    return json(request, { code, message }, status);
  }
});
