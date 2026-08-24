const configuredOrigin = Deno.env.get("CORS_ORIGIN") ?? "https://wineandchapters.co.za";

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": origin === configuredOrigin ? origin : configuredOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function assertTrustedOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin && origin !== configuredOrigin) throw new HttpError("Origin not allowed.", 403);
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export function json(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders(request) });
}

export function handleError(request: Request, error: unknown): Response {
  console.error(error);
  const status = error instanceof HttpError ? error.status : 500;
  const message = error instanceof HttpError ? error.message : "Something went wrong.";
  return json(request, { message }, status);
}

export function cleanText(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== "string") throw new HttpError(`${field} is required.`);
  const clean = value.trim();
  if (clean.length < min || clean.length > max) {
    throw new HttpError(`${field} must be between ${min} and ${max} characters.`);
  }
  return clean;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
