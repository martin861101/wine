import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { suggestionsService } from "@/modules/suggestions/suggestionsService";
import { handleApiError, parseBody, stripUndefined } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

const suggestionSchema = z.object({
  type: z.enum(["BOOK", "VENUE", "ACTIVITY", "THEME", "OTHER"]),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
});

export const Route = createFileRoute("/api/suggestions/")({
  server: {
    middleware: [requireAuth],
    handlers: {
      POST: async ({ request, context }) => {
        try {
          const body = await parseBody(request, suggestionSchema);
          const suggestion = await suggestionsService.create(
            context.auth.user.id,
            stripUndefined(body),
          );
          return Response.json(suggestion, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
