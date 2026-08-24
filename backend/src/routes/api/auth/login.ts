import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authService } from "@/modules/auth/authService";
import { handleApiError, parseBody } from "@/lib/validation";
import { setAuthCookies } from "@/lib/authCookies";
import { authRateLimit } from "@/middleware/rateLimit";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export const Route = createFileRoute("/api/auth/login")({
  server: {
    middleware: [authRateLimit],
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, loginSchema);
          const session = await authService.login(body.email, body.password, clientIp(request));
          return setAuthCookies(Response.json(session), session);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
