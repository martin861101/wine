import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { discussionsService } from "@/modules/discussions/discussionsService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

const commentSchema = z.object({
  body: z.string().trim().min(1, "Write a comment first.").max(2000),
});

export const Route = createFileRoute("/api/discussions/$threadId/comments")({
  server: {
    middleware: [requireAuth],
    handlers: {
      POST: async ({ request, context, params }) => {
        try {
          const body = await parseBody(request, commentSchema);
          const comment = await discussionsService.createComment(
            context.auth.user.id,
            params.threadId,
            body.body,
          );
          return Response.json(comment, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
