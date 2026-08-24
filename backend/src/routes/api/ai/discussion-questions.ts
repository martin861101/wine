import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { aiService } from "@/modules/ai/aiService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";
import { aiRateLimit } from "@/middleware/rateLimit";

const discussionQuestionsSchema = z.object({
  bookId: z.string().uuid(),
  count: z.coerce.number().int().min(3).max(12).optional(),
});

export const Route = createFileRoute("/api/ai/discussion-questions")({
  server: {
    middleware: [requireAuth, aiRateLimit],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, discussionQuestionsSchema);
          const result = await aiService.discussionQuestions(body.bookId, body.count);
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
