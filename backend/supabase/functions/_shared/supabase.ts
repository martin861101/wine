import { createClient } from "npm:@supabase/supabase-js@2";

import { HttpError } from "./http.ts";

export function serviceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceRoleKey) throw new Error("Supabase runtime credentials are unavailable.");
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}

export async function requireAdmin(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    throw new HttpError("Missing authorization token.", 401);
  const client = serviceClient();
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new HttpError("Invalid authorization token.", 401);
  const { data: member, error: memberError } = await client
    .from("users")
    .select("id,role,approved,email_verified")
    .eq("auth_user_id", data.user.id)
    .single();
  if (
    memberError ||
    !member ||
    member.role !== "ADMIN" ||
    !member.approved ||
    !member.email_verified
  ) {
    throw new HttpError("Administrator access required.", 403);
  }
  return { client, member };
}

export async function requireMember(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    throw new HttpError("Please sign in to use the reading-room assistant.", 401);
  const client = serviceClient();
  const token = authorization.slice("Bearer ".length);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new HttpError("Please sign in to continue.", 401);
  const { data: member, error: memberError } = await client
    .from("users")
    .select("id,role,approved,email_verified")
    .eq("auth_user_id", data.user.id)
    .single();
  if (memberError || !member || !member.approved || !member.email_verified) {
    throw new HttpError("An approved membership is required to use the assistant.", 403);
  }
  return { client, member };
}
