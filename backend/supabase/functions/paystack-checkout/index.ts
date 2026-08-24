import {
  assertTrustedOrigin,
  cleanText,
  corsHeaders,
  handleError,
  HttpError,
  json,
} from "../_shared/http.ts";
import {
  markMembershipPaid,
  membershipTiers,
  paystackRequest,
  type MembershipTier,
} from "../_shared/paystack.ts";
import { serviceClient } from "../_shared/supabase.ts";

async function optionalMember(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length);
  const client = serviceClient();
  const { data } = await client.auth.getUser(token);
  if (!data.user) return null;
  const { data: member } = await client
    .from("users")
    .select("id,email")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();
  return member;
}

async function assertOnlinePaymentsEnabled() {
  const client = serviceClient();
  const { data, error } = await client
    .from("payment_method_settings")
    .select("online_payments_enabled")
    .eq("singleton", true)
    .maybeSingle();
  // Fail closed: a missing or unreadable setting must never start a checkout.
  if (error || !data?.online_payments_enabled) {
    throw new HttpError(
      "Online payments are currently unavailable. Please use the payment instructions provided by Wine & Chapters.",
      503,
    );
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { message: "Method not allowed." }, 405);

  try {
    assertTrustedOrigin(request);
    const body = (await request.json()) as Record<string, unknown>;
    const action =
      body.action === "verify"
        ? "verify"
        : body.action === "contribution"
          ? "contribution"
          : "checkout";
    if (action === "verify") {
      const reference = cleanText(body.reference, "Reference", 36, 64);
      const result = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
      const providerData = result.data as Record<string, unknown> | undefined;
      if (!providerData) throw new HttpError("The payment provider returned no transaction.", 502);
      return json(request, await markMembershipPaid(reference, providerData));
    }

    await assertOnlinePaymentsEnabled();

    if (action === "contribution") {
      const amount = Number(body.amount);
      if (!Number.isInteger(amount) || amount < 2000 || amount > 10_000_000) {
        throw new HttpError("Choose a contribution between R20 and R100,000.");
      }
      const member = await optionalMember(request);
      const submittedEmail = cleanText(body.email, "Email", 5, 254).toLowerCase();
      const email = String(member?.email ?? submittedEmail).toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new HttpError("Enter a valid email address.");
      }

      const client = serviceClient();
      const { data: order, error } = await client
        .from("contribution_orders")
        .insert({
          user_id: member?.id ?? null,
          email,
          amount,
          currency: "ZAR",
          metadata: { source: "events_page" },
        })
        .select("id")
        .single();
      if (error || !order) throw error ?? new Error("Contribution order was not created.");

      try {
        const appUrl = Deno.env.get("PUBLIC_APP_URL") ?? "https://wineandchapters.co.za";
        const initialized = await paystackRequest("/transaction/initialize", {
          method: "POST",
          body: JSON.stringify({
            email,
            amount: String(amount),
            currency: "ZAR",
            reference: order.id,
            callback_url: `${appUrl}/events?contribution=thanks`,
            metadata: {
              payment_kind: "contribution",
              contribution_id: order.id,
              custom_fields: [
                {
                  display_name: "Contribution",
                  variable_name: "contribution_amount",
                  value: `R${(amount / 100).toFixed(2)}`,
                },
              ],
            },
          }),
        });
        const paystack = initialized.data as
          { authorization_url?: string; reference?: string } | undefined;
        if (!paystack?.authorization_url) {
          throw new HttpError("Secure checkout returned no checkout URL.", 502);
        }
        await client
          .from("contribution_orders")
          .update({ provider_reference: paystack.reference ?? order.id })
          .eq("id", order.id);
        return json(request, { checkoutUrl: paystack.authorization_url, reference: order.id });
      } catch (error) {
        await client.from("contribution_orders").update({ status: "FAILED" }).eq("id", order.id);
        throw error;
      }
    }

    const tier = cleanText(body.tier, "Membership tier", 2, 30) as MembershipTier;
    if (!(tier in membershipTiers)) throw new HttpError("Choose a valid paid membership.");
    const member = await optionalMember(request);
    const submittedEmail = cleanText(body.email, "Email", 5, 254).toLowerCase();
    const email = String(member?.email ?? submittedEmail).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      throw new HttpError("Enter a valid email address.");

    const client = serviceClient();
    const selected = membershipTiers[tier];
    const { data: order, error } = await client
      .from("membership_orders")
      .insert({
        user_id: member?.id ?? null,
        email,
        tier,
        amount: selected.amount,
        currency: "ZAR",
      })
      .select("id")
      .single();
    if (error || !order) throw error ?? new Error("Membership order was not created.");

    try {
      const appUrl = Deno.env.get("PUBLIC_APP_URL") ?? "https://wineandchapters.co.za";
      const initialized = await paystackRequest("/transaction/initialize", {
        method: "POST",
        body: JSON.stringify({
          email,
          amount: String(selected.amount),
          currency: "ZAR",
          reference: order.id,
          callback_url: `${appUrl}/membership?payment=verify`,
          metadata: {
            order_id: order.id,
            membership_tier: tier,
            custom_fields: [
              {
                display_name: "Membership",
                variable_name: "membership_tier",
                value: selected.label,
              },
            ],
          },
        }),
      });
      const paystack = initialized.data as
        { authorization_url?: string; reference?: string } | undefined;
      if (!paystack?.authorization_url)
        throw new HttpError("Secure checkout returned no checkout URL.", 502);
      await client
        .from("membership_orders")
        .update({ provider_reference: paystack.reference ?? order.id })
        .eq("id", order.id);
      return json(request, { checkoutUrl: paystack.authorization_url, reference: order.id });
    } catch (error) {
      await client.from("membership_orders").update({ status: "FAILED" }).eq("id", order.id);
      throw error;
    }
  } catch (error) {
    return handleError(request, error);
  }
});
