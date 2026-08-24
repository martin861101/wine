import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

const ALGO = "sha256";
const ACCESS_KEY = "wc_access";

interface AccessTokenPayload {
  sub: string;
  role: string;
}

function b64url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function sign(message: string, secret: string): string {
  return createHash(ALGO).update(`${secret}:${message}`).digest("hex");
}

export function createAccessToken(
  payload: AccessTokenPayload,
  secret: string,
  ttlSeconds: number,
): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + ttlSeconds,
    }),
  );
  const unsigned = `${header}.${body}`;
  return `${unsigned}.${sign(unsigned, secret)}`;
}

export function verifyAccessToken(token: string, secret: string): AccessTokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  if (!header || !body || !signature) return null;

  const expected = sign(`${header}.${body}`, secret);
  const expectedBuf = Buffer.from(expected);
  const givenBuf = Buffer.from(signature);
  if (expectedBuf.length !== givenBuf.length || !timingSafeEqual(expectedBuf, givenBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as AccessTokenPayload & {
      exp: number;
    };
    if (!payload.sub || typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) {
      return null;
    }
    return { sub: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return createHash(ALGO).update(token).digest("hex");
}

export function generateOpaqueToken(): string {
  return randomBytes(48).toString("base64url");
}

export function generateVerificationToken(): string {
  return randomUUID().replace(/-/g, "");
}

export function signRefreshToken(userId: string, secret: string, ttlDays: number): string {
  const body = b64url(
    JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + ttlDays * 86400 }),
  );
  const unsigned = `${ACCESS_KEY}.${body}`;
  return `${unsigned}.${sign(unsigned, secret)}`;
}

export function verifyRefreshToken(token: string, secret: string): { sub: string } | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [key, body, signature] = parts;
  if (key !== ACCESS_KEY || !body || !signature) return null;

  const expected = sign(`${key}.${body}`, secret);
  const expectedBuf = Buffer.from(expected);
  const givenBuf = Buffer.from(signature);
  if (expectedBuf.length !== givenBuf.length || !timingSafeEqual(expectedBuf, givenBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      sub: string;
      exp: number;
    };
    if (!payload.sub || payload.exp * 1000 < Date.now()) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}
