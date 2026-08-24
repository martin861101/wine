export class AppError extends Error {
  statusCode: number;
  code?: string;

  constructor(message: string, statusCode = 400, code?: string) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    if (code) this.code = code;
  }
}

export function jsonError(message: string, status = 400, code?: string) {
  return Response.json({ message, code }, { status });
}

export function notFound(message = "Not found") {
  return jsonError(message, 404);
}

export function unauthorized(message = "Authentication required") {
  return jsonError(message, 401);
}

export function forbidden(message = "You don't have permission to do that") {
  return jsonError(message, 403);
}
