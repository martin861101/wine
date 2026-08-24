import { handleError, HttpError, json } from "../_shared/http.ts";
import { markContributionPaid, markMembershipPaid } from "../_shared/paystack.ts";
import { serviceClient } from "../_shared/supabase.ts";

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json(request, { message: "Method not allowed." }, 405);
  try {
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
    const signature = request.headers.get("x-paystack-signature");
    if (!secret || !signature) throw new HttpError("Invalid webhook signature.", 401);
    const rawBody = await request.text();
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"],
    );
    const expected = toHex(
      await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)),
    );
    if (!safeEqual(signature, expected)) throw new HttpError("Invalid webhook signature.", 401);

    const payload = JSON.parse(rawBody) as {
      event?: string;
      data?: Record<string, unknown> & { id?: number | string; reference?: string };
    };
    if (!payload.event || !payload.data) return json(request, { received: true });
    const eventId = String(payload.data.id ?? payload.data.reference ?? crypto.randomUUID());
    const client = serviceClient();
    const { data: inserted } = await client
      .from("payment_webhook_events")
      .upsert(
        { provider: "paystack", event_id: eventId, type: payload.event, payload: payload.data },
        { onConflict: "provider,event_id", ignoreDuplicates: true },
      )
      .select("id")
      .maybeSingle();
    if (inserted && payload.event === "charge.success" && payload.data.reference) {
      const metadata = payload.data.metadata as Record<string, unknown> | undefined;
      if (metadata?.payment_kind === "contribution") {
        await markContributionPaid(payload.data.reference, payload.data);
      } else {
        await markMembershipPaid(payload.data.reference, payload.data);
      }
    }
    return json(request, { received: true });
  } catch (error) {
    return handleError(request, error);
  }
});
