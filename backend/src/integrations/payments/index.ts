import { env } from "../../config/env";
import type { PaymentProvider } from "./PaymentProvider";
import { PaystackPaymentProvider } from "./PaystackPaymentProvider";

export function getPaymentProvider(): PaymentProvider | null {
  if (env.PAYSTACK_SECRET_KEY) {
    return new PaystackPaymentProvider();
  }
  return null;
}
