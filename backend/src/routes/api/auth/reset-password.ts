import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authService } from "@/modules/auth/authService";
import { handleApiError, parseBody } from "@/lib/validation";
import { authRateLimit } from "@/middleware/rateLimit";

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8).max(128),
});

export const Route = createFileRoute("/api/auth/reset-password")({
  server: {
    middleware: [authRateLimit],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, resetPasswordSchema);
          const result = await authService.resetPassword(body.token, body.password);
          return Response.json(result);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
