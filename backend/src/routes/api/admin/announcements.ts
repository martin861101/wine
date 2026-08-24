import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { announcementsService } from "@/modules/announcements/announcementsService";
import { handleApiError, parseBody, stripUndefined } from "@/lib/validation";
import { requireAdmin } from "@/middleware/auth";
import { writeAuditLog } from "@/modules/audit/auditLog";
import { db } from "@/db/db";

const announcementSchema = z.object({
  title: z.string().trim().min(2).max(200),
  body: z.string().trim().min(2).max(5000),
  type: z.enum(["GENERAL", "EVENT", "BOOK", "PAYMENT", "URGENT"]).optional(),
  priority: z.coerce.number().int().min(0).max(10).optional(),
  startsAt: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const Route = createFileRoute("/api/admin/announcements")({
  server: {
    middleware: [requireAdmin],
    handlers: {
      POST: async ({ request, context }) => {
        try {
          const body = await parseBody(request, announcementSchema);
          const announcement = await announcementsService.create({
            ...stripUndefined(body),
            createdBy: context.auth.user.id,
          });
          void writeAuditLog(db, {
            actorId: context.auth.user.id,
            action: "announcement.create",
            entityType: "announcement",
            entityId: announcement.id,
          });
          return Response.json(announcement, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
