import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { clubBooksService } from "@/modules/club-books/clubBooksService";
import { booksService } from "@/modules/books/booksService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAdmin } from "@/middleware/auth";
import { writeAuditLog } from "@/modules/audit/auditLog";
import { db } from "@/db/db";

const setCurrentSchema = z.object({
  bookId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const progressSchema = z.object({
  progressPercent: z.coerce.number().int().min(0).max(100),
});

export const Route = createFileRoute("/api/admin/club-books/current")({
  server: {
    middleware: [requireAdmin],
    handlers: {
      PUT: async ({ request, context }) => {
        try {
          const body = await parseBody(request, setCurrentSchema);
          await booksService.getById(body.bookId);
          const result = await clubBooksService.setCurrentByBookId(
            body.bookId,
            body.startDate,
            body.endDate,
            context.auth.user.id,
          );
          void writeAuditLog(db, {
            actorId: context.auth.user.id,
            action: "club_books.set_current",
            entityType: "club_book",
            entityId: result.id,
          });
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
      PATCH: async ({ request }) => {
        try {
          const body = await parseBody(request, progressSchema);
          const current = await clubBooksService.updateProgress(body.progressPercent);
          return Response.json(current);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
