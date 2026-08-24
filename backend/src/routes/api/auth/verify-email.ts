import { createFileRoute } from "@tanstack/react-router";

import { authService } from "@/modules/auth/authService";
import { handleApiError } from "@/lib/validation";
import { authRateLimit } from "@/middleware/rateLimit";

export const Route = createFileRoute("/api/auth/verify-email")({
  server: {
    middleware: [authRateLimit],
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const token = url.searchParams.get("token");
          if (!token)
            return Response.json({ message: "Missing verification token." }, { status: 400 });
          const result = await authService.verifyEmail(token);
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
