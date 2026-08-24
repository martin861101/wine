import { env } from "../../config/env";
import type { EmailMessage, EmailProvider } from "./EmailProvider";
import { ResendEmailProvider } from "./ResendEmailProvider";

class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    console.info(`[email:console] ${message.subject} -> ${message.to}\n${message.text}`);
  }
}

let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!provider)
    provider =
      env.EMAIL_PROVIDER === "resend" ? new ResendEmailProvider() : new ConsoleEmailProvider();
  return provider;
}

export function verificationUrl(token: string): string {
  return `${env.PUBLIC_APP_URL.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;
}

export function resetPasswordUrl(token: string): string {
  return `${env.PUBLIC_APP_URL.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
}

function brandedEmailHtml(subject: string, contentHtml: string): string {
  const appUrl = env.PUBLIC_APP_URL.replace(/\/$/, "");
  const safeSubject = subject
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  return `<!doctype html><html><body style="margin:0;background:#f8f1ea;color:#351a22;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f1ea"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fffaf6;border:1px solid #eadbd2;border-radius:24px;overflow:hidden"><tr><td align="center" style="background:#5d2434;padding:28px"><img src="${appUrl}/img/wine-chapters-logo.png" width="92" alt="Wine &amp; Chapters" style="display:block;max-width:92px;height:auto"><div style="margin-top:12px;color:#f8e9df;font-family:Georgia,serif;font-size:20px">Wine &amp; Chapters</div></td></tr><tr><td style="padding:38px 34px"><h1 style="margin:0 0 22px;font-family:Georgia,serif;font-size:30px;line-height:1.25;color:#5d2434">${safeSubject}</h1><div style="font-size:16px;line-height:1.7;color:#513d43">${contentHtml}</div></td></tr><tr><td style="padding:24px 34px;background:#f1e4dc;color:#78656b;font-size:12px;line-height:1.6;text-align:center">Books begin the conversation. Community keeps the chapter going.<br>Wine &amp; Chapters · Johannesburg, South Africa</td></tr></table></td></tr></table></body></html>`;
}

export async function sendEmail(message: EmailMessage): Promise<void> {
  await getEmailProvider().send({
    ...message,
    html: brandedEmailHtml(message.subject, message.html),
  });
}
