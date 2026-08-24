import {
  cleanText,
  corsHeaders,
  handleError,
  HttpError,
  json,
  assertTrustedOrigin,
} from "../_shared/http.ts";
import { sendEmail } from "../_shared/email.ts";
import { serviceClient } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { message: "Method not allowed." }, 405);
  try {
    assertTrustedOrigin(request);
    const body = (await request.json()) as Record<string, unknown>;
    const name = cleanText(body.name, "Name", 2, 100);
    const email = cleanText(body.email, "Email", 5, 254).toLowerCase();
    const subject = cleanText(body.subject, "Subject", 2, 200);
    const message = cleanText(body.message, "Message", 2, 5000);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      throw new HttpError("Enter a valid email address.");

    const client = serviceClient();
    const { data, error } = await client
      .from("contact_messages")
      .insert({ name, email, subject, message })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Contact message was not stored.");

    const delivered = await sendEmail({
      to: Deno.env.get("CONTACT_EMAIL") ?? "hello@wineandchapters.co.za",
      replyTo: email,
      subject: `[Website] ${subject}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    });
    if (delivered) {
      await client
        .from("contact_messages")
        .update({ delivered_at: new Date().toISOString() })
        .eq("id", data.id);
      await sendEmail({
        to: email,
        subject: "We received your message",
        text: `Hi ${name},\n\nThank you for writing to Wine & Chapters. Your note about “${subject}” is safely with the committee, and we’ll be in touch soon.\n\nWarmly,\nWine & Chapters`,
      });
    }
    return json(request, { message: "Thank you — your message is with the committee." });
  } catch (error) {
    return handleError(request, error);
  }
});
