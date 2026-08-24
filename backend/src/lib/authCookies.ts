import type { AuthSession } from "../modules/auth/authService";

export const ACCESS_COOKIE = "wc_access_token";
export const REFRESH_COOKIE = "wc_refresh_token";

function cookieAttributes(maxAge: number): string {
  return [
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
}

export function setAuthCookies(response: Response, session: AuthSession): Response {
  const headers = new Headers(response.headers);
  headers.append(
    "Set-Cookie",
    `${ACCESS_COOKIE}=${encodeURIComponent(session.accessToken)}; ${cookieAttributes(900)}`,
  );
  headers.append(
    "Set-Cookie",
    `${REFRESH_COOKIE}=${encodeURIComponent(session.refreshToken)}; ${cookieAttributes(60 * 60 * 24 * 30)}`,
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function clearAuthCookies(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", `${ACCESS_COOKIE}=; ${cookieAttributes(0)}`);
  headers.append("Set-Cookie", `${REFRESH_COOKIE}=; ${cookieAttributes(0)}`);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const pair = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : null;
}
