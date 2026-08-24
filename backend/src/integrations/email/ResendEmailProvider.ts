import { env } from "../../config/env";
import type { EmailMessage, EmailProvider } from "./EmailProvider";

export class ResendEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<void> {
    if (!env.RESEND_API_KEY) throw new Error("Resend email provider requires RESEND_API_KEY.");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) throw new Error(`Email delivery failed: HTTP ${response.status}`);
  }
}
