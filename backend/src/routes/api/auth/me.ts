import { createFileRoute } from "@tanstack/react-router";

import { authService } from "@/modules/auth/authService";
import { handleApiError } from "@/lib/validation";
import { requireAuth } from "@/middleware/auth";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    middleware: [requireAuth],
    handlers: {
      GET: async ({ context }) => {
        try {
          const me = await authService.me(context.auth.user.id);
          return Response.json(me);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
