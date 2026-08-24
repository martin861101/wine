import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { aiService } from "@/modules/ai/aiService";
import { handleApiError, parseBody, stripUndefined } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";
import { aiRateLimit } from "@/middleware/rateLimit";

const reviewAssistSchema = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(10).max(20_000),
  goal: z.string().trim().max(200).optional(),
});

export const Route = createFileRoute("/api/ai/review-assist")({
  server: {
    middleware: [requireAuth, aiRateLimit],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, reviewAssistSchema);
          const result = await aiService.reviewAssist(stripUndefined(body));
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
