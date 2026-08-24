import { createFileRoute } from "@tanstack/react-router";

import { giveawaysService } from "@/modules/giveaways/giveawaysService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/giveaways/$giveawayId/enter")({
  server: {
    middleware: [requireAuth],
    handlers: {
      POST: async ({ params, context }) => {
        try {
          const result = await giveawaysService.enter(params.giveawayId, context.auth.user.id);
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
