import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { eventsService } from "@/modules/events/eventsService";
import { handleApiError, parseBody, stripUndefined } from "@/lib/validation";
import { requireAdmin } from "@/middleware/auth";
import { writeAuditLog } from "@/modules/audit/auditLog";
import { db } from "@/db/db";

const updateSchema = z.object({
  title: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  venueName: z.string().trim().min(2).max(200).optional(),
  venueAddress: z.string().trim().max(300).optional(),
  theme: z.string().trim().max(200).optional(),
  coverImage: z.string().trim().max(500).optional(),
  capacity: z.coerce.number().int().min(1).max(1000).optional(),
  contributionAmount: z.coerce.number().int().min(0).optional(),
  rsvpDeadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  paymentDeadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]).optional(),
});

export const Route = createFileRoute("/api/admin/events/$eventId")({
  server: {
    middleware: [requireAdmin],
    handlers: {
      PUT: async ({ request, params, context }) => {
        try {
          const body = await parseBody(request, updateSchema);
          const event = await eventsService.update(params.eventId, stripUndefined(body));
          void writeAuditLog(db, {
            actorId: context.auth.user.id,
            action: "event.update",
            entityType: "event",
            entityId: event.id,
          });
          return Response.json(event);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ params, context }) => {
        try {
          await eventsService.remove(params.eventId);
          void writeAuditLog(db, {
            actorId: context.auth.user.id,
            action: "event.delete",
            entityType: "event",
            entityId: params.eventId,
          });
          return Response.json({ message: "Event deleted." });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
