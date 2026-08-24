import { z } from "zod";
import { jsonError } from "../lib/errors";

export async function parseBody<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 1_000_000) throw new ApiValidationError("Request body is too large.");
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiValidationError("Request body must be valid JSON.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new ApiValidationError(parsed.error.issues[0]?.message ?? "Invalid input.");
  }
  return parsed.data;
}

export class ApiValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiValidationError";
  }
}

export function handleApiError(error: unknown): Response {
  if (error instanceof ApiValidationError) {
    return jsonError(error.message, 400, "VALIDATION");
  }
  if (error instanceof z.ZodError) {
    return jsonError(error.issues[0]?.message ?? "Invalid input.", 400, "VALIDATION");
  }
  if (error instanceof Error && "statusCode" in error) {
    const appError = error as Error & { statusCode: number; code?: string };
    return jsonError(appError.message, appError.statusCode, appError.code);
  }
  console.error("[api] unhandled error", error);
  return jsonError("Something went wrong on our end.", 500, "INTERNAL");
}

export function zodSchema<T extends z.ZodType>(schema: T): T {
  return schema;
}

type StripUndefinedType<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};

/**
 * Remove keys whose value is `undefined` from an object. Zod optional fields
 * type as `T | undefined`, which trips `exactOptionalPropertyTypes` when passed
 * straight to service input types. Required keys stay required, optional keys
 * stay optional and drop the `undefined` from their type.
 */
export function stripUndefined<T extends object>(input: T): StripUndefinedType<T> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned as StripUndefinedType<T>;
}
