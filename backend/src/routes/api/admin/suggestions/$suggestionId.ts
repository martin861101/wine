import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { suggestionsService } from "@/modules/suggestions/suggestionsService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAdmin } from "@/middleware/auth";
import { writeAuditLog } from "@/modules/audit/auditLog";
import { db } from "@/db/db";

const statusSchema = z.object({
  status: z.enum(["NEW", "REVIEWED", "ACCEPTED", "DECLINED"]),
});

export const Route = createFileRoute("/api/admin/suggestions/$suggestionId")({
  server: {
    middleware: [requireAdmin],
    handlers: {
      GET: async () => {
        try {
          const suggestions = await suggestionsService.list();
          return Response.json({ suggestions });
        } catch (error) {
          return handleApiError(error);
        }
      },
      PATCH: async ({ request, params, context }) => {
        try {
          const body = await parseBody(request, statusSchema);
          await suggestionsService.setStatus(params.suggestionId, body.status);
          void writeAuditLog(db, {
            actorId: context.auth.user.id,
            action: `suggestion.set_${body.status.toLowerCase()}`,
            entityType: "suggestion",
            entityId: params.suggestionId,
          });
          return Response.json({ message: `Suggestion marked ${body.status.toLowerCase()}.` });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
