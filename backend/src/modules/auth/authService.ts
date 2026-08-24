import { db, withTransaction } from "../../db/db";
import { AppError } from "../../lib/errors";
import { hashPassword, verifyPassword } from "../../lib/password";
import {
  createAccessToken,
  generateVerificationToken,
  hashToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../lib/tokens";
import { env } from "../../config/env";
import { mapUserRow, toPublicUser } from "../users/userTypes";
import { writeAuditLog } from "../audit/auditLog";
import { resetPasswordUrl, sendEmail, verificationUrl } from "../../integrations/email";

export interface AuthSession {
  user: ReturnType<typeof toPublicUser>;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  region?: string;
  instagram?: string;
}

function accessTtlSeconds(): number {
  const match = /^(\d+)(s|m|h|d)?$/.exec(env.JWT_ACCESS_TTL);
  if (!match) return 900;
  const amount = Number(match[1]);
  const unit = match[2] ?? "s";
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[unit as "s" | "m" | "h" | "d"];
  return amount * mult;
}

async function issueRefreshToken(userId: string, ip?: string): Promise<string> {
  const raw = signRefreshToken(userId, env.JWT_REFRESH_SECRET, env.JWT_REFRESH_TTL_DAYS);
  const tokenHash = hashToken(raw);
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + ($3 || ' days')::interval)`,
    [userId, tokenHash, env.JWT_REFRESH_TTL_DAYS],
  );
  void writeAuditLog(db, { actorId: userId, action: "auth.token_issued", ip });
  return raw;
}

async function revokeRefreshToken(raw: string): Promise<void> {
  const tokenHash = hashToken(raw);
  await db.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`, [tokenHash]);
}

async function createSession(userId: string, ip?: string): Promise<AuthSession> {
  const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
  const row = result.rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new AppError("Account not found", 404);
  const user = mapUserRow(row);
  if (!user.email_verified || !user.approved) {
    throw new AppError("This account is not currently active.", 403, "ACCOUNT_INACTIVE");
  }
  const accessToken = createAccessToken(
    { sub: user.id, role: user.role },
    env.JWT_ACCESS_SECRET,
    accessTtlSeconds(),
  );
  const refreshToken = await issueRefreshToken(user.id, ip);
  return { user: toPublicUser(user), accessToken, refreshToken };
}

export const authService = {
  async register(input: RegisterInput): Promise<{ message: string }> {
    const email = input.email.trim().toLowerCase();
    const passwordHash = await hashPassword(input.password);
    const verificationToken = generateVerificationToken();
    const tokenHash = hashToken(verificationToken);
    await withTransaction(async (client) => {
      const existing = await client.query("SELECT 1 FROM users WHERE email = $1", [email]);
      if (existing.rowCount && existing.rowCount > 0) {
        throw new AppError("An account with that email already exists.", 409);
      }
      const inserted = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, region, instagram, email_verified, approved)
         VALUES ($1, $2, $3, $4, $5, $6, false, false) RETURNING id`,
        [
          email,
          passwordHash,
          input.firstName,
          input.lastName,
          input.region ?? null,
          input.instagram ?? null,
        ],
      );
      const userId = String((inserted.rows[0] as { id: string }).id);
      await client.query("INSERT INTO profiles (user_id) VALUES ($1)", [userId]);
      await client.query(
        `INSERT INTO auth_tokens (user_id, kind, token_hash, expires_at)
         VALUES ($1, 'verify_email', $2, now() + interval '48 hours')`,
        [userId, tokenHash],
      );
    });
    await sendEmail({
      to: email,
      subject: "Verify your Wine & Chapters email",
      text: `Confirm your email address: ${verificationUrl(verificationToken)}`,
      html: `<p>Confirm your Wine & Chapters email address.</p><p><a href="${verificationUrl(verificationToken)}">Verify your email</a></p>`,
    });
    void writeAuditLog(db, { action: "auth.register", entityType: "user", entityId: email });
    return {
      message: "Application received. Check your inbox to verify your email address.",
    };
  },

  async login(email: string, password: string, ip?: string): Promise<AuthSession> {
    const normalized = email.trim().toLowerCase();
    const result = await db.query("SELECT * FROM users WHERE email = $1", [normalized]);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) {
      throw new AppError("That email and password combination doesn't match our records.", 401);
    }
    const ok = await verifyPassword(password, String(row.password_hash));
    if (!ok) {
      throw new AppError("That email and password combination doesn't match our records.", 401);
    }
    const user = mapUserRow(row);
    if (!user.email_verified) {
      throw new AppError(
        "Please verify your email address before signing in.",
        403,
        "EMAIL_NOT_VERIFIED",
      );
    }
    if (!user.approved) {
      throw new AppError(
        "Your membership application is still awaiting approval.",
        403,
        "ACCOUNT_PENDING",
      );
    }
    void writeAuditLog(db, { actorId: user.id, action: "auth.login", ip });
    return createSession(user.id, ip);
  },

  async refresh(rawRefreshToken: string, ip?: string): Promise<AuthSession> {
    const payload = verifyRefreshToken(rawRefreshToken, env.JWT_REFRESH_SECRET);
    if (!payload) throw new AppError("Invalid or expired refresh token.", 401);

    const tokenHash = hashToken(rawRefreshToken);
    const stored = await db.query(
      `SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    );
    const row = stored.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new AppError("Refresh token is no longer valid.", 401);
    if (new Date(String(row.expires_at)) < new Date()) {
      throw new AppError("Refresh token has expired.", 401);
    }

    await db.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1`, [row.id]);
    return createSession(String(row.user_id), ip);
  },

  async logout(rawRefreshToken?: string | null, userId?: string): Promise<void> {
    if (rawRefreshToken) {
      await revokeRefreshToken(rawRefreshToken);
    }
    void writeAuditLog(db, { actorId: userId, action: "auth.logout" });
  },

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const normalized = email.trim().toLowerCase();
    const result = await db.query("SELECT id FROM users WHERE email = $1", [normalized]);
    const row = result.rows[0] as { id: string } | undefined;
    if (!row) {
      return { message: "If that email is registered, a reset link is on its way." };
    }
    const token = generateVerificationToken();
    const tokenHash = hashToken(token);
    await db.query(
      `INSERT INTO auth_tokens (user_id, kind, token_hash, expires_at)
       VALUES ($1, 'reset_password', $2, now() + interval '1 hour')`,
      [row.id, tokenHash],
    );
    await sendEmail({
      to: normalized,
      subject: "Reset your Wine & Chapters password",
      text: `Reset your password: ${resetPasswordUrl(token)}`,
      html: `<p>Reset your Wine & Chapters password.</p><p><a href="${resetPasswordUrl(token)}">Choose a new password</a></p>`,
    });
    void writeAuditLog(db, { actorId: row.id, action: "auth.password_reset_requested" });
    return { message: "If that email is registered, a reset link is on its way." };
  },

  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    const tokenHash = hashToken(token);
    const stored = await db.query(
      `SELECT * FROM auth_tokens WHERE kind = 'reset_password' AND token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
      [tokenHash],
    );
    const row = stored.rows[0] as { id: string; user_id: string } | undefined;
    if (!row) throw new AppError("That reset link is invalid or has expired.", 400);

    const passwordHash = await hashPassword(password);
    await withTransaction(async (client) => {
      await client.query("UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2", [
        passwordHash,
        row.user_id,
      ]);
      await client.query(`UPDATE auth_tokens SET used_at = now() WHERE id = $1`, [row.id]);
      await client.query(`UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1`, [
        row.user_id,
      ]);
    });
    void writeAuditLog(db, { actorId: row.user_id, action: "auth.password_reset" });
    return { message: "Your password has been updated. You can sign in now." };
  },

  async verifyEmail(token: string): Promise<{ message: string }> {
    const tokenHash = hashToken(token);
    const stored = await db.query(
      `SELECT * FROM auth_tokens WHERE kind = 'verify_email' AND token_hash = $1 AND used_at IS NULL AND expires_at > now()`,
      [tokenHash],
    );
    const row = stored.rows[0] as { id: string; user_id: string } | undefined;
    if (!row) throw new AppError("That verification link is invalid or has expired.", 400);
    await db.query("UPDATE users SET email_verified = true, updated_at = now() WHERE id = $1", [
      row.user_id,
    ]);
    await db.query(`UPDATE auth_tokens SET used_at = now() WHERE id = $1`, [row.id]);
    void writeAuditLog(db, { actorId: row.user_id, action: "auth.email_verified" });
    return { message: "Your email address is verified. Welcome to Wine & Chapters." };
  },

  async me(userId: string) {
    const result = await db.query("SELECT * FROM users WHERE id = $1", [userId]);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new AppError("Account not found", 404);
    return toPublicUser(mapUserRow(row));
  },
};
