import { createFileRoute } from "@tanstack/react-router";

import { eventsService } from "@/modules/events/eventsService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/events/upcoming")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async () => {
        try {
          const event = await eventsService.upcoming();
          return Response.json(event);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
