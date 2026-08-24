import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { reviewsService } from "@/modules/reviews/reviewsService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

const reviewSchema = z.object({
  title: z.string().trim().min(1, "Give your review a title").max(200),
  body: z.string().trim().min(10, "Write a little more — at least 10 characters.").max(20_000),
  containsSpoilers: z.boolean().default(false),
});

export const Route = createFileRoute("/api/books/$bookId/reviews")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ params, context }) => {
        try {
          const reviews = await reviewsService.getForBook(params.bookId, context.auth.user.id);
          const count = await reviewsService.countPublished(params.bookId);
          return Response.json({ count, reviews });
        } catch (error) {
          return handleApiError(error);
        }
      },
      POST: async ({ request, params, context }) => {
        try {
          const body = await parseBody(request, reviewSchema);
          const review = await reviewsService.create(params.bookId, context.auth.user.id, body);
          return Response.json(review, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
