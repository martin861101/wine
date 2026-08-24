import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { aiService } from "@/modules/ai/aiService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";
import { aiRateLimit } from "@/middleware/rateLimit";

const bookComparisonSchema = z.object({
  bookIds: z.array(z.string().uuid()).min(2, "Choose at least two books.").max(5),
});

export const Route = createFileRoute("/api/ai/book-comparison")({
  server: {
    middleware: [requireAuth, aiRateLimit],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, bookComparisonSchema);
          const result = await aiService.bookComparison(body.bookIds);
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
