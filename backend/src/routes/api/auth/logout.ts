import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authService } from "@/modules/auth/authService";
import { handleApiError, parseBody } from "@/lib/validation";
import { REFRESH_COOKIE, clearAuthCookies, readCookie } from "@/lib/authCookies";

const logoutSchema = z.object({ refreshToken: z.string().min(10).optional() });

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await parseBody(request, logoutSchema);
          await authService.logout(body.refreshToken ?? readCookie(request, REFRESH_COOKIE));
          return clearAuthCookies(Response.json({ message: "Signed out." }));
        } catch (error) {
          return handleApiError(error);
        }
      },
    },
  },
});
