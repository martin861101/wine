import { createFileRoute } from "@tanstack/react-router";

import { giveawaysService } from "@/modules/giveaways/giveawaysService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/giveaways/")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ context }) => {
        try {
          const giveaways = await giveawaysService.listActive();
          const withEntryState = await Promise.all(
            giveaways.map(async (g) => ({
              ...g,
              entered: await giveawaysService.hasEntered(g.id, context.auth.user.id),
            })),
          );
          return Response.json({ giveaways: withEntryState });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
