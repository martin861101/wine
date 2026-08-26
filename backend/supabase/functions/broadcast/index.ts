import {
  assertTrustedOrigin,
  cleanText,
  corsHeaders,
  handleError,
  HttpError,
  json,
} from "../_shared/http.ts";
import { sendEmail } from "../_shared/email.ts";
import { requireAdmin } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { message: "Method not allowed." }, 405);
  try {
    assertTrustedOrigin(request);
    const { client } = await requireAdmin(request);
    if (!Deno.env.get("SMTP_HOST") || !Deno.env.get("SMTP_USER") || !Deno.env.get("SMTP_PASSWORD"))
      throw new HttpError("Broadcast email is not configured.", 503);
    const body = (await request.json()) as Record<string, unknown>;
    const audience = cleanText(body.audience, "Audience", 3, 20);
    const subject = cleanText(body.subject, "Subject", 2, 200);
    const message = cleanText(body.body, "Message", 2, 10000);
    if (!["MEMBERS", "SUBSCRIBERS", "ALL"].includes(audience))
      throw new HttpError("Invalid audience.");

    const recipients = new Set<string>();
    if (audience === "MEMBERS" || audience === "ALL") {
      const { data, error } = await client
        .from("users")
        .select("email")
        .eq("email_verified", true)
        .eq("blocked", false)
        .is("deleted_at", null);
      if (error) throw error;
      for (const row of data ?? []) recipients.add(row.email);
    }
    if (audience === "SUBSCRIBERS" || audience === "ALL") {
      const { data, error } = await client
        .from("newsletter_subscribers")
        .select("email")
        .eq("subscribed", true);
      if (error) throw error;
      for (const row of data ?? []) recipients.add(row.email);
    }

    let sent = 0;
    let failed = 0;
    for (const recipient of recipients) {
      try {
        await sendEmail({ to: recipient, subject, text: message });
        sent += 1;
      } catch (error) {
        console.error("Broadcast delivery failed.", {
          errorType: error instanceof Error ? error.name : typeof error,
        });
        failed += 1;
      }
    }
    if (failed > 0) {
      throw new HttpError("One or more broadcast emails could not be delivered.", 502);
    }
    return json(request, { audience, recipients: recipients.size, sent, failed });
  } catch (error) {
    return handleError(request, error);
  }
});
