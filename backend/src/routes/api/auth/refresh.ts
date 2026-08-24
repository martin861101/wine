import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authService } from "@/modules/auth/authService";
import { handleApiError, parseBody } from "@/lib/validation";
import { REFRESH_COOKIE, readCookie, setAuthCookies } from "@/lib/authCookies";

const refreshSchema = z.object({ refreshToken: z.string().min(10).optional() });

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

export const Route = createFileRoute("/api/auth/refresh")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, refreshSchema);
          const refreshToken = body.refreshToken ?? readCookie(request, REFRESH_COOKIE);
          if (!refreshToken)
            return Response.json({ message: "Refresh token is required." }, { status: 401 });
          const session = await authService.refresh(refreshToken, clientIp(request));
          return setAuthCookies(Response.json(session), session);
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
