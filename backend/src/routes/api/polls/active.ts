import { createFileRoute } from "@tanstack/react-router";

import { pollsService } from "@/modules/polls/pollsService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/polls/active")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ context }) => {
        try {
          const polls = await pollsService.listActive();
          const detailed = await Promise.all(
            polls.map((p) => pollsService.getResults(p.id, context.auth.user.id).catch(() => null)),
          );
          return Response.json({ polls: detailed.filter(Boolean) });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
