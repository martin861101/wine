import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { giveawaysService } from "@/modules/giveaways/giveawaysService";
import { handleApiError, parseBody, stripUndefined } from "@/lib/validation";
import { requireAdmin } from "@/middleware/auth";
import { writeAuditLog } from "@/modules/audit/auditLog";
import { db } from "@/db/db";

const giveawaySchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  prize: z.string().trim().min(2).max(200),
  imageUrl: z.string().trim().max(500).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(),
});

export const Route = createFileRoute("/api/admin/giveaways")({
  server: {
    middleware: [requireAdmin],
    handlers: {
      POST: async ({ request, context }) => {
        try {
          const body = await parseBody(request, giveawaySchema);
          const result = await giveawaysService.create(stripUndefined(body));
          void writeAuditLog(db, {
            actorId: context.auth.user.id,
            action: "giveaway.create",
            entityType: "giveaway",
            entityId: String(result.id),
          });
          return Response.json(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
