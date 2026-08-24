import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { booksService } from "@/modules/books/booksService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

const searchSchema = z.object({
  q: z.string().trim().min(1).max(200),
});

export const Route = createFileRoute("/api/books/search")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const parsed = searchSchema.safeParse({ q: url.searchParams.get("q") ?? "" });
          if (!parsed.success) {
            return Response.json({ message: "Provide a search query." }, { status: 400 });
          }
          const books = await booksService.search(parsed.data.q);
          return Response.json({ results: books });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
