import { createFileRoute } from "@tanstack/react-router";

import { leaderboardService } from "@/modules/leaderboard/leaderboardService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/leaderboard/")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 20), 1), 100);
          const result = await leaderboardService.get(limit);
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
