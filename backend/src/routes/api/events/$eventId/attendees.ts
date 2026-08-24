import { createFileRoute } from "@tanstack/react-router";

import { rsvpService } from "@/modules/events/eventsService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/events/$eventId/attendees")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ params }) => {
        try {
          const attendees = await rsvpService.attendees(params.eventId);
          return Response.json({ attendees });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
