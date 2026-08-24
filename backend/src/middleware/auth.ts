import { createMiddleware } from "@tanstack/react-start";
import { verifyAccessToken } from "../lib/tokens";
import { env } from "../config/env";
import { db } from "../db/db";
import { mapUserRow, toPublicUser } from "../modules/users/userTypes";
import { jsonError } from "../lib/errors";
import { ACCESS_COOKIE, readCookie } from "../lib/authCookies";

export interface AuthContext {
  user: ReturnType<typeof toPublicUser>;
}

function extractToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return readCookie(request, ACCESS_COOKIE);
}

export async function loadUserFromRequest(request: Request): Promise<AuthContext | null> {
  const token = extractToken(request);
  if (!token) return null;
  const payload = verifyAccessToken(token, env.JWT_ACCESS_SECRET);
  if (!payload) return null;

  const result = await db.query("SELECT * FROM users WHERE id = $1", [payload.sub]);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row || !row.email_verified || !row.approved) return null;
  return { user: toPublicUser(mapUserRow(row)) };
}

export const requireAuth = createMiddleware().server(async ({ next, request }) => {
  const auth = await loadUserFromRequest(request);
  if (!auth) {
    return jsonError("Authentication required", 401, "UNAUTHENTICATED");
  }
  return next({ context: { auth } });
});

export const requireAdmin = createMiddleware()
  .middleware([requireAuth])
  .server(async ({ next, context }) => {
    if (context.auth.user.role !== "ADMIN") {
      return jsonError("You don't have permission to do that", 403, "FORBIDDEN");
    }
    return next();
  });
