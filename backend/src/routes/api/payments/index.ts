import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { paymentsService } from "@/modules/payments/paymentsService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

const createPaymentSchema = z.object({
  eventId: z.string().uuid().optional(),
  type: z.enum(["EVENT", "CONTRIBUTION", "MERCHANDISE", "MEMBERSHIP", "DONATION"]),
  amount: z.coerce.number().int().min(1, "Amount must be at least 1."),
  currency: z.string().length(3).default("ZAR"),
  metadata: z.record(z.unknown()).optional(),
});

export const Route = createFileRoute("/api/payments/")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ context }) => {
        try {
          const payments = await paymentsService.listForUser(context.auth.user.id);
          return Response.json({ payments });
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request, context }) => {
        try {
          const body = await parseBody(request, createPaymentSchema);
          const payment = await paymentsService.create({
            userId: context.auth.user.id,
            eventId: body.eventId,
            type: body.type,
            amount: body.amount,
            currency: body.currency,
            metadata: body.metadata,
          });
          const checkout = await paymentsService.createCheckout(payment.id);
          return Response.json({ payment, checkout }, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
