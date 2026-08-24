import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";
import { env } from "./config/env";

import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
});

const apiSecurityMiddleware = createMiddleware().server(async ({ next, request }) => {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/")) return next();

  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    if (origin && origin !== env.CORS_ORIGIN) return new Response("Forbidden", { status: 403 });
    return new Response(null, { status: 204, headers: apiHeaders(origin) });
  }

  const result = await next();
  const response = result.response;
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(apiHeaders(origin))) headers.set(key, value);
  return {
    ...result,
    response: new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }),
  };
});

function apiHeaders(origin: string | null): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    ...(origin === env.CORS_ORIGIN
      ? {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Credentials": "true",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          Vary: "Origin",
        }
      : {}),
  };
}

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware, csrfMiddleware, apiSecurityMiddleware],
}));
