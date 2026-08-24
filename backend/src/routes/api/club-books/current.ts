import { createFileRoute } from "@tanstack/react-router";

import { clubBooksService } from "@/modules/club-books/clubBooksService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/club-books/current")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ context }) => {
        try {
          const current = await clubBooksService.getWithMyRating(context.auth.user.id);
          if (!current) {
            return Response.json({ message: "No current book selected yet." }, { status: 404 });
          }
          return Response.json(current);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
