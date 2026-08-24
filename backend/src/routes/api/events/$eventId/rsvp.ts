import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { rsvpService } from "@/modules/events/eventsService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

const rsvpSchema = z.object({
  status: z.enum(["ATTENDING", "MAYBE", "DECLINED"]),
  guestCount: z.coerce.number().int().min(1).max(10).default(1),
});

export const Route = createFileRoute("/api/events/$eventId/rsvp")({
  server: {
    middleware: [requireAuth],
    handlers: {
      POST: async ({ request, params, context }) => {
        try {
          const body = await parseBody(request, rsvpSchema);
          const result = await rsvpService.rsvp(
            params.eventId,
            context.auth.user.id,
            body.status,
            body.guestCount,
          );
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ params, context }) => {
        try {
          await rsvpService.remove(params.eventId, context.auth.user.id);
          return Response.json({ message: "RSVP removed." });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
