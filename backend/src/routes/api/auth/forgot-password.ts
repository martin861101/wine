import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authService } from "@/modules/auth/authService";
import { handleApiError, parseBody } from "@/lib/validation";
import { authRateLimit } from "@/middleware/rateLimit";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
});

export const Route = createFileRoute("/api/auth/forgot-password")({
  server: {
    middleware: [authRateLimit],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, forgotPasswordSchema);
          const result = await authService.requestPasswordReset(body.email);
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
