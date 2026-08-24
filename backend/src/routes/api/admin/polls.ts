import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { pollsService } from "@/modules/polls/pollsService";
import { handleApiError, parseBody, stripUndefined } from "@/lib/validation";
import { requireAdmin } from "@/middleware/auth";
import { writeAuditLog } from "@/modules/audit/auditLog";
import { db } from "@/db/db";

const pollSchema = z.object({
  type: z.enum(["BOOK_BALLOT", "MONTHLY_POLL", "GENERAL"]),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  hideResults: z.boolean().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(),
  options: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(200),
        bookId: z.string().uuid().optional().nullable(),
        imageUrl: z.string().trim().max(500).optional().nullable(),
      }),
    )
    .min(2)
    .max(20),
});

export const Route = createFileRoute("/api/admin/polls")({
  server: {
    middleware: [requireAdmin],
    handlers: {
      POST: async ({ request, context }) => {
        try {
          const body = await parseBody(request, pollSchema);
          const poll = await pollsService.create(stripUndefined(body), context.auth.user.id);
          void writeAuditLog(db, {
            actorId: context.auth.user.id,
            action: "poll.create",
            entityType: "poll",
            entityId: poll.id,
          });
          return Response.json(poll, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
