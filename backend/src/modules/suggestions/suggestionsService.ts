import { db } from "../../db/db";

export type SuggestionType = "BOOK" | "VENUE" | "ACTIVITY" | "THEME" | "OTHER";

export const suggestionsService = {
  async create(
    userId: string,
    input: { type: SuggestionType; title: string; description?: string },
  ) {
    const result = await db.query(
      `INSERT INTO suggestions (user_id, type, title, description)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [userId, input.type, input.title, input.description ?? null],
    );
    const row = result.rows[0] as Record<string, unknown>;
    return {
      id: String(row.id),
      type: String(row.type),
      title: String(row.title),
      description: row.description ? String(row.description) : null,
      status: String(row.status),
      createdAt: new Date(String(row.created_at)).toISOString(),
    };
  },

  async list() {
    const result = await db.query(
      `SELECT s.*, u.first_name || ' ' || u.last_name AS submitted_by
       FROM suggestions s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.created_at DESC`,
    );
    return result.rows.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      userId: String(row.user_id),
      submittedBy: row.submitted_by ? String(row.submitted_by) : "",
      type: String(row.type),
      title: String(row.title),
      description: row.description ? String(row.description) : null,
      status: String(row.status),
      createdAt: new Date(String(row.created_at)).toISOString(),
    }));
  },

  async setStatus(id: string, status: "NEW" | "REVIEWED" | "ACCEPTED" | "DECLINED") {
    await db.query(`UPDATE suggestions SET status = $1 WHERE id = $2`, [status, id]);
  },
};
