import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { reviewsService } from "@/modules/reviews/reviewsService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAdmin } from "@/middleware/auth";
import { writeAuditLog } from "@/modules/audit/auditLog";
import { db } from "@/db/db";

const statusSchema = z.object({
  status: z.enum(["PENDING", "PUBLISHED", "HIDDEN"]),
});

export const Route = createFileRoute("/api/admin/reviews/$reviewId")({
  server: {
    middleware: [requireAdmin],
    handlers: {
      PATCH: async ({ request, params, context }) => {
        try {
          const body = await parseBody(request, statusSchema);
          await reviewsService.setStatus(params.reviewId, body.status);
          void writeAuditLog(db, {
            actorId: context.auth.user.id,
            action: `review.set_${body.status.toLowerCase()}`,
            entityType: "review",
            entityId: params.reviewId,
          });
          return Response.json({ message: `Review marked ${body.status.toLowerCase()}.` });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
