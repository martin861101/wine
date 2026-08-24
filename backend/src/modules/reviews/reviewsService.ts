import { db } from "../../db/db";
import { AppError } from "../../lib/errors";

export type ReviewStatus = "PENDING" | "PUBLISHED" | "HIDDEN";

export interface ReviewCreate {
  title: string;
  body: string;
  containsSpoilers: boolean;
}

export interface ReviewRow {
  id: string;
  book_id: string;
  user_id: string;
  title: string;
  body: string;
  contains_spoilers: boolean;
  status: ReviewStatus;
  created_at: Date;
  updated_at: Date;
}

function mapReviewRow(row: Record<string, unknown>): ReviewRow {
  return {
    id: String(row.id),
    book_id: String(row.book_id),
    user_id: String(row.user_id),
    title: String(row.title),
    body: String(row.body),
    contains_spoilers: Boolean(row.contains_spoilers),
    status: String(row.status) as ReviewStatus,
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
  };
}

export function toApiReview(row: ReviewRow, authorName?: string) {
  return {
    id: row.id,
    bookId: row.book_id,
    userId: row.user_id,
    authorName: authorName ?? "",
    title: row.title,
    body: row.body,
    containsSpoilers: row.contains_spoilers,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export const reviewsService = {
  async create(
    bookId: string,
    userId: string,
    input: ReviewCreate,
  ): Promise<ReturnType<typeof toApiReview>> {
    const book = await db.query("SELECT 1 FROM books WHERE id = $1", [bookId]);
    if (!book.rowCount || book.rowCount === 0) throw new AppError("Book not found", 404);

    const result = await db.query(
      `INSERT INTO reviews (book_id, user_id, title, body, contains_spoilers, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')
       RETURNING *`,
      [bookId, userId, input.title, input.body, input.containsSpoilers],
    );
    return toApiReview(mapReviewRow(result.rows[0] as Record<string, unknown>));
  },

  async getForBook(
    bookId: string,
    currentUserId?: string,
    limit = 50,
    offset = 0,
  ): Promise<Array<ReturnType<typeof toApiReview>>> {
    const result = await db.query(
      `SELECT r.*, u.first_name || ' ' || u.last_name AS author_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.book_id = $1 AND r.status = 'PUBLISHED'
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [bookId, limit, offset],
    );
    return result.rows.map((row: Record<string, unknown>) =>
      toApiReview(mapReviewRow(row), row.author_name ? String(row.author_name) : undefined),
    );
  },

  async countPublished(bookId: string): Promise<number> {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM reviews WHERE book_id = $1 AND status = 'PUBLISHED'`,
      [bookId],
    );
    return Number((result.rows[0] as { count: number }).count);
  },

  async update(
    id: string,
    userId: string,
    input: Partial<ReviewCreate>,
  ): Promise<ReturnType<typeof toApiReview>> {
    const existing = await db.query("SELECT * FROM reviews WHERE id = $1", [id]);
    const row = existing.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new AppError("Review not found", 404);
    if (String(row.user_id) !== userId) {
      throw new AppError("You can only edit your own review.", 403);
    }

    const result = await db.query(
      `UPDATE reviews
       SET title = $1, body = $2, contains_spoilers = $3, updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [
        input.title ?? String(row.title),
        input.body ?? String(row.body),
        input.containsSpoilers ?? Boolean(row.contains_spoilers),
        id,
      ],
    );
    return toApiReview(mapReviewRow(result.rows[0] as Record<string, unknown>));
  },

  async remove(id: string, userId: string, isAdmin = false): Promise<void> {
    const existing = await db.query("SELECT * FROM reviews WHERE id = $1", [id]);
    const row = existing.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new AppError("Review not found", 404);
    if (!isAdmin && String(row.user_id) !== userId) {
      throw new AppError("You can only delete your own review.", 403);
    }
    await db.query("DELETE FROM reviews WHERE id = $1", [id]);
  },

  async setStatus(id: string, status: ReviewStatus): Promise<void> {
    await db.query(`UPDATE reviews SET status = $1, updated_at = now() WHERE id = $2`, [
      status,
      id,
    ]);
  },
};
