import nodemailer from "npm:nodemailer@7";

import { escapeHtml } from "./http.ts";

type Email = { to: string | string[]; subject: string; text: string; replyTo?: string };

export class EmailDeliveryError extends Error {
  constructor(message: string, readonly providerStatus?: number) {
    super(message);
  }
}

export function brandedEmailHtml(subject: string, contentHtml: string): string {
  const appUrl = (Deno.env.get("PUBLIC_APP_URL") ?? "https://wineandchapters.co.za").replace(
    /\/$/,
    "",
  );
  return `<!doctype html><html><body style="margin:0;background:#f8f1ea;color:#351a22;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f1ea"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fffaf6;border:1px solid #eadbd2;border-radius:24px;overflow:hidden"><tr><td align="center" style="background:#5d2434;padding:28px"><img src="${appUrl}/img/wine-chapters-logo.png" width="92" alt="Wine &amp; Chapters" style="display:block;max-width:92px;height:auto"><div style="margin-top:12px;color:#f8e9df;font-family:Georgia,serif;font-size:20px">Wine &amp; Chapters</div></td></tr><tr><td style="padding:38px 34px"><h1 style="margin:0 0 22px;font-family:Georgia,serif;font-size:30px;line-height:1.25;color:#5d2434">${escapeHtml(subject)}</h1><div style="font-size:16px;line-height:1.7;color:#513d43">${contentHtml}</div></td></tr><tr><td style="padding:24px 34px;background:#f1e4dc;color:#78656b;font-size:12px;line-height:1.6;text-align:center">Books begin the conversation. Community keeps the chapter going.<br>Wine &amp; Chapters · Johannesburg, South Africa</td></tr></table></td></tr></table></body></html>`;
}

export async function sendEmail(input: Email): Promise<boolean> {
  const host = Deno.env.get("SMTP_HOST");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASSWORD");
  if (!host || !user || !pass) {
    console.error("Email delivery is unavailable: SMTP configuration is incomplete.");
    throw new EmailDeliveryError("Email delivery is not configured.");
  }

  const port = Number(Deno.env.get("SMTP_PORT") ?? "465");
  const secure = (Deno.env.get("SMTP_SECURE") ?? "true").toLowerCase() === "true";
  const from = Deno.env.get("EMAIL_FROM") ?? "Wine & Chapters <hello@wineandchapters.co.za>";

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  try {
    const result = await transport.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: brandedEmailHtml(
        input.subject,
        `<div style="white-space:pre-wrap">${escapeHtml(input.text)}</div>`,
      ),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });
    if (result.rejected.length > 0) {
      throw new EmailDeliveryError("The SMTP provider rejected one or more recipients.");
    }
  } catch (error) {
    if (error instanceof EmailDeliveryError) throw error;
    const providerStatus =
      typeof error === "object" && error && "responseCode" in error &&
      typeof error.responseCode === "number"
        ? error.responseCode
        : undefined;
    console.error("SMTP delivery request failed.", { providerStatus });
    throw new EmailDeliveryError("The email provider could not accept the message.", providerStatus);
  }
  return true;
}
