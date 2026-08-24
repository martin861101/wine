import { createFileRoute } from "@tanstack/react-router";

import { eventsService } from "@/modules/events/eventsService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/events/")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const includePast = url.searchParams.get("includePast") === "true";
          const events = await eventsService.list({ includePast });
          return Response.json({ events });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
