function configuredOrigin(): string {
  const denoRuntime = (
    globalThis as typeof globalThis & { Deno?: { env: { get(name: string): string | undefined } } }
  ).Deno;
  return denoRuntime?.env.get("CORS_ORIGIN") ?? "https://wineandchapters.co.za";
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const allowedOrigin = configuredOrigin();
  return {
    "Access-Control-Allow-Origin": origin === allowedOrigin ? origin : allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function assertTrustedOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin && origin !== configuredOrigin()) throw new HttpError("Origin not allowed.", 403);
}

export type HttpErrorOptions = {
  retryable?: boolean | undefined;
  category?: string | undefined;
  upstreamStatus?: number | undefined;
  upstreamRequestId?: string | undefined;
};

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status = 400,
    options: HttpErrorOptions = {},
  ) {
    super(message);
    this.name = "HttpError";
    this.retryable = options.retryable ?? (status === 429 || status >= 500);
    this.category = options.category;
    this.upstreamStatus = options.upstreamStatus;
    this.upstreamRequestId = options.upstreamRequestId;
  }

  readonly retryable: boolean;
  readonly category: string | undefined;
  readonly upstreamStatus: number | undefined;
  readonly upstreamRequestId: string | undefined;
}

export function json(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders(request) });
}

export function handleError(request: Request, error: unknown): Response {
  const status = error instanceof HttpError ? error.status : 500;
  console.error("Edge Function request failed.", {
    status,
    errorType: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorStack: error instanceof Error ? error.stack : undefined,
    category: error instanceof HttpError ? error.category : undefined,
    upstreamStatus: error instanceof HttpError ? error.upstreamStatus : undefined,
    upstreamRequestId: error instanceof HttpError ? error.upstreamRequestId : undefined,
  });
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
