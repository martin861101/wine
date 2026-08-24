import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { reviewsService } from "@/modules/reviews/reviewsService";
import { handleApiError, parseBody, stripUndefined } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

const updateSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().min(10).max(20_000).optional(),
  containsSpoilers: z.boolean().optional(),
});

export const Route = createFileRoute("/api/reviews/$reviewId")({
  server: {
    middleware: [requireAuth],
    handlers: {
      PUT: async ({ request, params, context }) => {
        try {
          const body = await parseBody(request, updateSchema);
          const review = await reviewsService.update(
            params.reviewId,
            context.auth.user.id,
            stripUndefined(body),
          );
          return Response.json(review);
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ params, context }) => {
        try {
          await reviewsService.remove(params.reviewId, context.auth.user.id);
          return Response.json({ message: "Review deleted." });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
