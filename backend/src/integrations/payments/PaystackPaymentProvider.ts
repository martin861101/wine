import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";
import type { CheckoutInput, CheckoutResult, PaymentProvider } from "./PaymentProvider";

/**
 * Paystack payment provider. Complete implementation using Paystack's REST
 * API directly (no SDK dependency). Only active when PAYSTACK_SECRET_KEY is
 * set. Amounts are passed in the currency's minor units (e.g. cents for ZAR),
 * matching the rest of the payments module.
 */
export class PaystackPaymentProvider implements PaymentProvider {
  private secretKey: string;
  private baseUrl = "https://api.paystack.co";

  constructor() {
    if (!env.PAYSTACK_SECRET_KEY) {
      throw new Error("Paystack provider requires PAYSTACK_SECRET_KEY");
    }
    this.secretKey = env.PAYSTACK_SECRET_KEY;
  }

  private async api(
    path: string,
    options: { method?: string; body?: Record<string, unknown> } = {},
  ): Promise<Record<string, unknown>> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
      "Content-Type": "application/json",
    };
    const init: RequestInit = {
      method: options.method ?? "GET",
      headers,
      signal: AbortSignal.timeout(30_000),
    };
    if (options.body) init.body = JSON.stringify(options.body);
    const response = await fetch(`${this.baseUrl}${path}`, init);
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok || data.status === false) {
      const message =
        typeof data.message === "string" && data.message
          ? data.message
          : `Paystack API error: HTTP ${response.status}`;
      throw new Error(message);
    }
    return data;
  }

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!input.email) {
      throw new Error("Paystack checkout requires a customer email.");
    }
    const data = (await this.api("/transaction/initialize", {
      method: "POST",
      body: {
        email: input.email,
        amount: String(input.amount),
        currency: input.currency.toUpperCase(),
        reference: input.reference,
        callback_url: input.successUrl,
        metadata: {
          custom_fields: Object.entries(input.metadata ?? {}).map(([display_name, value]) => ({
            display_name,
            variable_name: display_name,
            value,
          })),
        },
      },
    })) as {
      data?: { authorization_url?: string | null; reference?: string | null };
    };
    return {
      checkoutUrl: data.data?.authorization_url ?? null,
      providerReference: data.data?.reference ?? null,
    };
  }

  async verifyPayment(providerReference: string): Promise<{ status: string }> {
    const data = (await this.api(
      `/transaction/verify/${encodeURIComponent(providerReference)}`,
    )) as {
      data?: { status?: string };
    };
    const status = data.data?.status ?? "unknown";
    return { status: status === "success" ? "paid" : status };
  }

  async handleWebhook(request: Request): Promise<{
    eventId: string;
    type: string;
    payload: unknown;
  } | null> {
    const body = await request.text();
    const signature = request.headers.get("x-paystack-signature");
    if (!signature) {
      throw new Error("Paystack webhook signature verification is not configured.");
    }

    const computed = createHmac("sha512", this.secretKey).update(body).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(computed);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new Error("Paystack webhook signature mismatch.");
    }

    const event = JSON.parse(body) as {
      event?: string;
      data?: { id?: number | string; reference?: string };
    };
    if (!event.event || !event.data) return null;
    return {
      eventId: String(event.data.id ?? event.data.reference ?? "unknown"),
      type: event.event,
      payload: event.data,
    };
  }

  async refundPayment(providerReference: string, amount?: number): Promise<void> {
    await this.api("/refund", {
      method: "POST",
      body: {
        transaction: providerReference,
        ...(amount != null ? { amount } : {}),
      },
    });
  }
}
