import { db } from "../../db/db";
import { AppError } from "../../lib/errors";

export const giveawaysService = {
  async listActive() {
    const result = await db.query(
      `SELECT g.*,
              (SELECT COUNT(*)::int FROM giveaway_entries ge WHERE ge.giveaway_id = g.id) AS entries
       FROM giveaways g
       WHERE g.status = 'ACTIVE' AND (g.ends_at IS NULL OR g.ends_at > now())
       ORDER BY g.starts_at DESC`,
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      title: String(row.title),
      description: row.description ? String(row.description) : null,
      prize: String(row.prize),
      imageUrl: row.image_url ? String(row.image_url) : null,
      startsAt: new Date(String(row.starts_at)).toISOString(),
      endsAt: row.ends_at ? new Date(String(row.ends_at)).toISOString() : null,
      status: String(row.status),
      entries: Number(row.entries),
    }));
  },

  async create(input: {
    title: string;
    description?: string;
    prize: string;
    imageUrl?: string;
    startsAt?: string;
    endsAt?: string;
    status?: "DRAFT" | "ACTIVE" | "CLOSED";
  }) {
    const result = await db.query(
      `INSERT INTO giveaways (title, description, prize, image_url, starts_at, ends_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        input.title,
        input.description ?? null,
        input.prize,
        input.imageUrl ?? null,
        input.startsAt ?? new Date().toISOString(),
        input.endsAt ?? null,
        input.status ?? "DRAFT",
      ],
    );
    return result.rows[0];
  },

  async enter(giveawayId: string, userId: string) {
    const giveaway = await db.query(
      `SELECT * FROM giveaways WHERE id = $1 AND status = 'ACTIVE' AND (ends_at IS NULL OR ends_at > now())`,
      [giveawayId],
    );
    if (!giveaway.rowCount || giveaway.rowCount === 0) {
      throw new AppError("This giveaway is not open for entries.", 404);
    }
    const inserted = await db.query(
      `INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES ($1,$2)
       ON CONFLICT (giveaway_id, user_id) DO NOTHING
       RETURNING id`,
      [giveawayId, userId],
    );
    if (!inserted.rowCount)
      throw new AppError("You've already entered this giveaway.", 409, "ALREADY_ENTERED");
    return { entered: true };
  },

  async hasEntered(giveawayId: string, userId: string): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM giveaway_entries WHERE giveaway_id = $1 AND user_id = $2`,
      [giveawayId, userId],
    );
    return Boolean(result.rowCount && result.rowCount > 0);
  },
};
