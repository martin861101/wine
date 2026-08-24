import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { paymentsService } from "@/modules/payments/paymentsService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAdmin } from "@/middleware/auth";
import { writeAuditLog } from "@/modules/audit/auditLog";
import { db } from "@/db/db";

const refundSchema = z.object({});

export const Route = createFileRoute("/api/admin/payments")({
  server: {
    middleware: [requireAdmin],
    handlers: {
      GET: async () => {
        try {
          const payments = await paymentsService.listAll();
          return Response.json({ payments });
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request, context }) => {
        try {
          const url = new URL(request.url);
          const paymentId = url.searchParams.get("paymentId");
          if (!paymentId) {
            return Response.json({ message: "paymentId is required." }, { status: 400 });
          }
          void refundSchema.parse({});
          await paymentsService.refund(paymentId, context.auth.user.id);
          return Response.json({ message: "Payment refunded." });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
