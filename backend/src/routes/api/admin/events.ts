import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { eventsService } from "@/modules/events/eventsService";
import { handleApiError, parseBody, stripUndefined } from "@/lib/validation";
import { requireAdmin } from "@/middleware/auth";
import { writeAuditLog } from "@/modules/audit/auditLog";
import { db } from "@/db/db";

const eventSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).optional(),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/)
    .optional(),
  venueName: z.string().trim().min(2).max(200),
  venueAddress: z.string().trim().max(300).optional(),
  theme: z.string().trim().max(200).optional(),
  coverImage: z.string().trim().max(500).optional(),
  capacity: z.coerce.number().int().min(1).max(1000),
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

export const Route = createFileRoute("/api/admin/events")({
  server: {
    middleware: [requireAdmin],
    handlers: {
      POST: async ({ request, context }) => {
        try {
          const body = await parseBody(request, eventSchema);
          const event = await eventsService.create(stripUndefined(body));
          void writeAuditLog(db, {
            actorId: context.auth.user.id,
            action: "event.create",
            entityType: "event",
            entityId: event.id,
          });
          return Response.json(event, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
