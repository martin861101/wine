import { HttpError } from "../../_shared/http.ts";

export function objectArgs(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError("Invalid tool input.");
  }
  return value as Record<string, unknown>;
}

export function requiredString(
  record: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
): string {
  const value = record[key];
  if (typeof value !== "string") throw new HttpError(`Invalid ${key}.`);
  const clean = value.trim();
  if (clean.length < min || clean.length > max) throw new HttpError(`Invalid ${key}.`);
  return clean;
}

export function optionalString(
  record: Record<string, unknown>,
  key: string,
  max: number,
): string | undefined {
  const value = record[key];
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new HttpError(`Invalid ${key}.`);
  const clean = value.trim();
  if (!clean || clean.length > max) throw new HttpError(`Invalid ${key}.`);
  return clean;
}

export function optionalInteger(
  record: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  fallback: number,
): number {
  const value = record[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new HttpError(`Invalid ${key}.`);
  }
  return value;
}

export function enumValue<const T extends readonly string[]>(
  record: Record<string, unknown>,
  key: string,
  allowed: T,
): T[number] {
  const value = record[key];
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new HttpError(`Invalid ${key}.`);
  }
  return value as T[number];
}
