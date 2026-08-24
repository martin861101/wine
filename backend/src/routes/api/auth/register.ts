import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authService } from "@/modules/auth/authService";
import { handleApiError, parseBody, stripUndefined } from "@/lib/validation";
import { authRateLimit } from "@/middleware/rateLimit";

const registerSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(128),
  region: z.string().trim().max(80).optional(),
  instagram: z.string().trim().max(40).optional(),
});

export const Route = createFileRoute("/api/auth/register")({
  server: {
    middleware: [authRateLimit],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, registerSchema);
          const result = await authService.register(stripUndefined(body));
          return Response.json(result, { status: 201 });
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
