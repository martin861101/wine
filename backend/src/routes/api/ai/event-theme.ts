import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { aiService } from "@/modules/ai/aiService";
import { handleApiError, parseBody, stripUndefined } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";
import { aiRateLimit } from "@/middleware/rateLimit";

const eventThemeSchema = z.object({
  occasion: z.string().trim().max(200).optional(),
  description: z.string().trim().max(1000).optional(),
});

export const Route = createFileRoute("/api/ai/event-theme")({
  server: {
    middleware: [requireAuth, aiRateLimit],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, eventThemeSchema);
          const result = await aiService.eventTheme(stripUndefined(body));
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
