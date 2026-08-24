import { createFileRoute } from "@tanstack/react-router";

import { announcementsService } from "@/modules/announcements/announcementsService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/announcements/active")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async () => {
        try {
          const announcements = await announcementsService.listActive();
          return Response.json({ announcements });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
