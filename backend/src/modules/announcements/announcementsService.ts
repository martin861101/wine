import { db } from "../../db/db";

export type AnnouncementType = "GENERAL" | "EVENT" | "BOOK" | "PAYMENT" | "URGENT";

export const announcementsService = {
  async listActive() {
    const result = await db.query(
      `SELECT * FROM announcements
       WHERE starts_at <= now() AND (expires_at IS NULL OR expires_at > now())
       ORDER BY priority DESC, created_at DESC`,
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      title: String(row.title),
      body: String(row.body),
      type: String(row.type),
      priority: Number(row.priority ?? 0),
      startsAt: new Date(String(row.starts_at)).toISOString(),
      expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : null,
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));
  },

  async create(input: {
    title: string;
    body: string;
    type?: AnnouncementType;
    priority?: number;
    startsAt?: string;
    expiresAt?: string;
    createdBy: string;
  }) {
    const result = await db.query(
      `INSERT INTO announcements (title, body, type, priority, starts_at, expires_at, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        input.title,
        input.body,
        input.type ?? "GENERAL",
        input.priority ?? 0,
        input.startsAt ?? new Date().toISOString(),
        input.expiresAt ?? null,
        input.createdBy,
      ],
    );
    const row = result.rows[0] as Record<string, unknown>;
    return {
      id: String(row.id),
      title: String(row.title),
      body: String(row.body),
      type: String(row.type),
      priority: Number(row.priority ?? 0),
      startsAt: new Date(String(row.starts_at)).toISOString(),
      expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : null,
    };
  },
};
