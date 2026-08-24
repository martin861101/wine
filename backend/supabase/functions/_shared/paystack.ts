import { HttpError } from "./http.ts";
import { serviceClient } from "./supabase.ts";

export const membershipTiers = {
  CHAPTER_MEMBER: { amount: 18_000, label: "Chapter Member" },
  PATRON: { amount: 45_000, label: "Patron" },
} as const;

export type MembershipTier = keyof typeof membershipTiers;

export async function paystackRequest(path: string, options: RequestInit = {}) {
  const secret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!secret) throw new HttpError("Payments are not configured.", 503);
  const response = await fetch(`https://api.paystack.co${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    signal: AbortSignal.timeout(25_000),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || data.status === false) {
    console.error("Paystack request failed", response.status, data.message);
    throw new HttpError("Paystack could not start the payment. Please try again.", 502);
  }
  return data;
}

export async function markMembershipPaid(reference: string, providerData: Record<string, unknown>) {
  const client = serviceClient();
  const { data: order, error } = await client
    .from("membership_orders")
    .select("id,user_id,email,tier,amount,currency,status")
    .eq("id", reference)
    .single();
  if (error || !order) throw new HttpError("Membership payment was not found.", 404);

  const paidAmount = Number(providerData.amount);
  const paidCurrency = String(providerData.currency ?? "").toUpperCase();
  if (
    paidAmount !== Number(order.amount) ||
    paidCurrency !== String(order.currency).toUpperCase()
  ) {
    throw new HttpError("The payment amount did not match the selected membership.", 409);
  }
  if (providerData.status !== "success") return { paid: false, tier: order.tier };

  const paidAt = new Date().toISOString();
  await client
    .from("membership_orders")
    .update({ status: "PAID", paid_at: paidAt, metadata: providerData })
    .eq("id", order.id);

  let userId = order.user_id as string | null;
  if (!userId) {
    const { data: member } = await client
      .from("users")
      .select("id")
      .ilike("email", String(order.email))
      .maybeSingle();
    userId = member?.id ?? null;
  }
  if (userId) {
    await client
      .from("users")
      .update({
        membership_tier: order.tier,
        membership_status: "ACTIVE",
        membership_paid_at: paidAt,
      })
      .eq("id", userId);
    await client.from("membership_orders").update({ user_id: userId }).eq("id", order.id);
    await client.from("payments").upsert({
      id: order.id,
      user_id: userId,
      provider: "paystack",
      provider_reference: reference,
      type: "MEMBERSHIP",
      amount: order.amount,
      currency: order.currency,
      status: "PAID",
      metadata: { tier: order.tier },
      paid_at: paidAt,
    });
  }
  return { paid: true, tier: order.tier };
}

export async function markContributionPaid(
  reference: string,
  providerData: Record<string, unknown>,
) {
  const client = serviceClient();
  const { data: order, error } = await client
    .from("contribution_orders")
    .select("id,user_id,email,amount,currency,status")
    .eq("id", reference)
    .maybeSingle();
  if (error || !order) throw new HttpError("Contribution payment was not found.", 404);

  const paidAmount = Number(providerData.amount);
  const paidCurrency = String(providerData.currency ?? "").toUpperCase();
  if (
    paidAmount !== Number(order.amount) ||
    paidCurrency !== String(order.currency).toUpperCase()
  ) {
    throw new HttpError("The contribution amount did not match the checkout.", 409);
  }
  if (providerData.status !== "success") return { paid: false };

  const paidAt = new Date().toISOString();
  await client
    .from("contribution_orders")
    .update({ status: "PAID", paid_at: paidAt, metadata: providerData })
    .eq("id", order.id);

  if (order.user_id) {
    await client.from("payments").upsert({
      id: order.id,
      user_id: order.user_id,
      provider: "paystack",
      provider_reference: reference,
      type: "CONTRIBUTION",
      amount: order.amount,
      currency: order.currency,
      status: "PAID",
      metadata: { source: "events_page" },
      paid_at: paidAt,
    });
  }
  return { paid: true };
}
