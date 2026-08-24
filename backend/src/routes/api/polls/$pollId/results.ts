import { createFileRoute } from "@tanstack/react-router";

import { pollsService } from "@/modules/polls/pollsService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/polls/$pollId/results")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ params, context }) => {
        try {
          const results = await pollsService.getResults(params.pollId, context.auth.user.id);
          return Response.json(results);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
