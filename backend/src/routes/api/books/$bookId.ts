import { createFileRoute } from "@tanstack/react-router";

import { booksService } from "@/modules/books/booksService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/books/$bookId")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ params }) => {
        try {
          const book = await booksService.getById(params.bookId);
          return Response.json(book);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
