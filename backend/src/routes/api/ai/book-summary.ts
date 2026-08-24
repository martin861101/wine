import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { aiService } from "@/modules/ai/aiService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";
import { aiRateLimit } from "@/middleware/rateLimit";

const bookSummarySchema = z.object({
  bookId: z.string().uuid(),
});

export const Route = createFileRoute("/api/ai/book-summary")({
  server: {
    middleware: [requireAuth, aiRateLimit],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, bookSummarySchema);
          const result = await aiService.bookSummary(body.bookId);
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
