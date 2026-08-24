import { createFileRoute } from "@tanstack/react-router";

import { eventsService } from "@/modules/events/eventsService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/events/$eventId")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ params, context }) => {
        try {
          const event = await eventsService.getWithStats(params.eventId, context.auth.user.id);
          return Response.json(event);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
