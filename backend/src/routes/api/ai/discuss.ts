import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { aiService } from "@/modules/ai/aiService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";
import { aiRateLimit } from "@/middleware/rateLimit";

const discussSchema = z.object({
  bookId: z.string().uuid(),
  message: z.string().trim().min(1).max(2000),
});

export const Route = createFileRoute("/api/ai/discuss")({
  server: {
    middleware: [requireAuth, aiRateLimit],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, discussSchema);
          const result = await aiService.discuss(body.bookId, body.message);
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
