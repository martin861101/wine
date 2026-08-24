import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { paymentsService } from "@/modules/payments/paymentsService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

const checkoutSchema = z.object({
  paymentId: z.string().uuid(),
});

export const Route = createFileRoute("/api/payments/checkout")({
  server: {
    middleware: [requireAuth],
    handlers: {
      POST: async ({ request, context }) => {
        try {
          const body = await parseBody(request, checkoutSchema);
          const payment = await paymentsService.getById(body.paymentId);
          if (payment.userId !== context.auth.user.id) {
            return Response.json(
              { message: "You can only check out your own payments." },
              { status: 403 },
            );
          }
          const checkout = await paymentsService.createCheckout(body.paymentId);
          return Response.json(checkout);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
