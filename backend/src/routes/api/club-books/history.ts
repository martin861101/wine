import { createFileRoute } from "@tanstack/react-router";

import { clubBooksService } from "@/modules/club-books/clubBooksService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/club-books/history")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async () => {
        try {
          const history = await clubBooksService.getHistory();
          return Response.json({ history });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
