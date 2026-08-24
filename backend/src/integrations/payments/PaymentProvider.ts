export interface CheckoutInput {
  amount: number;
  currency: string;
  description: string;
  reference: string; // our internal payment id
  email?: string; // customer email required by Paystack
  metadata?: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  checkoutUrl: string | null;
  providerReference: string | null;
}

export interface PaymentProvider {
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyPayment(providerReference: string): Promise<{ status: string }>;
  handleWebhook(
    request: Request,
  ): Promise<{ eventId: string; type: string; payload: unknown } | null>;
  refundPayment(providerReference: string, amount?: number): Promise<void>;
}
