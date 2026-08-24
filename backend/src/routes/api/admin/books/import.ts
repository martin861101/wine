import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { booksService } from "@/modules/books/booksService";
import { handleApiError, parseBody, stripUndefined } from "@/lib/validation";
import { requireAdmin } from "@/middleware/auth";

const bookSchema = z.object({
  externalProvider: z.string().trim().min(1).max(50),
  externalId: z.string().trim().min(1).max(200),
  title: z.string().trim().min(1).max(500),
  author: z.string().trim().min(1).max(500),
  subtitle: z.string().trim().max(500).optional(),
  description: z.string().max(50_000).optional(),
  isbn10: z.string().trim().max(20).optional(),
  isbn13: z.string().trim().max(20).optional(),
  publisher: z.string().trim().max(300).optional(),
  publishedDate: z.string().trim().max(50).optional(),
  categories: z.array(z.string().trim().max(100)).max(20).default([]),
  coverUrl: z.string().url().max(2_000).optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const Route = createFileRoute("/api/admin/books/import")({
  server: {
    middleware: [requireAdmin],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, bookSchema);
          const book = await booksService.importExternal(stripUndefined(body));
          return Response.json(book, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
