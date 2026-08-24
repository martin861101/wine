import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { pollsService } from "@/modules/polls/pollsService";
import { handleApiError, parseBody } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

const voteSchema = z.object({
  optionId: z.string().uuid("A valid option is required."),
});

export const Route = createFileRoute("/api/polls/$pollId/vote")({
  server: {
    middleware: [requireAuth],
    handlers: {
      POST: async ({ request, params, context }) => {
        try {
          const body = await parseBody(request, voteSchema);
          const result = await pollsService.vote(
            params.pollId,
            body.optionId,
            context.auth.user.id,
          );
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
