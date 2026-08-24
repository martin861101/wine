import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ratingsService } from "@/modules/ratings/ratingsService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

const ratingSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5, "Rating must be between 1 and 5."),
});

export const Route = createFileRoute("/api/books/$bookId/rating")({
  server: {
    middleware: [requireAuth],
    handlers: {
      POST: async ({ request, params, context }) => {
        try {
          await ratingsService.assertBookExists(params.bookId);
          const body = await parseBody(request, ratingSchema);
          await ratingsService.upsert(params.bookId, context.auth.user.id, body.rating);
          const aggregate = await ratingsService.getAggregate(params.bookId);
          return Response.json({ bookId: params.bookId, myRating: body.rating, ...aggregate });
        } catch (error) {
          return handleApiError(error);
        }
      },
      PUT: async ({ request, params, context }) => {
        try {
          await ratingsService.assertBookExists(params.bookId);
          const body = await parseBody(request, ratingSchema);
          await ratingsService.upsert(params.bookId, context.auth.user.id, body.rating);
          const aggregate = await ratingsService.getAggregate(params.bookId);
          return Response.json({ bookId: params.bookId, myRating: body.rating, ...aggregate });
        } catch (error) {
          return handleApiError(error);
        }
      },
      DELETE: async ({ params, context }) => {
        try {
          await ratingsService.assertBookExists(params.bookId);
          await ratingsService.remove(params.bookId, context.auth.user.id);
          const aggregate = await ratingsService.getAggregate(params.bookId);
          return Response.json({ bookId: params.bookId, myRating: null, ...aggregate });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
