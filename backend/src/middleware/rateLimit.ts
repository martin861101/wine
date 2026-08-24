import { createMiddleware } from "@tanstack/react-start";
import { jsonError } from "../lib/errors";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  name: string;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: Request, name: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${name}:${forwarded || request.headers.get("x-real-ip") || "unknown"}`;
}

export function createRateLimit(options: RateLimitOptions) {
  return createMiddleware().server(async ({ next, request }) => {
    const now = Date.now();
    const key = clientKey(request, options.name);
    const current = buckets.get(key);
    const bucket =
      !current || current.resetAt <= now ? { count: 0, resetAt: now + options.windowMs } : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    if (bucket.count > options.max)
      return jsonError("Too many requests. Please try again shortly.", 429, "RATE_LIMITED");
    return next();
  });
}

export const authRateLimit = createRateLimit({ name: "auth", windowMs: 15 * 60_000, max: 30 });
export const aiRateLimit = createRateLimit({ name: "ai", windowMs: 60_000, max: 20 });
