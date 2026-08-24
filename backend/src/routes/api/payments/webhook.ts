import { createFileRoute } from "@tanstack/react-router";

import { paymentsService } from "@/modules/payments/paymentsService";
import { handleApiError } from "@/lib/validation";

export const Route = createFileRoute("/api/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const result = await paymentsService.processWebhook(request);
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
