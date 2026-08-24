import { db } from "../../db/db";
import { AppError } from "../../lib/errors";

export const ratingsService = {
  async upsert(bookId: string, userId: string, rating: number): Promise<void> {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new AppError("Rating must be an integer between 1 and 5.", 400);
    }
    await db.query(
      `INSERT INTO ratings (book_id, user_id, rating, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (book_id, user_id)
       DO UPDATE SET rating = EXCLUDED.rating, updated_at = now()`,
      [bookId, userId, rating],
    );
  },

  async remove(bookId: string, userId: string): Promise<void> {
    await db.query(`DELETE FROM ratings WHERE book_id = $1 AND user_id = $2`, [bookId, userId]);
  },

  async getUserRating(userId: string, bookId: string): Promise<number | null> {
    const result = await db.query(
      `SELECT rating FROM ratings WHERE book_id = $1 AND user_id = $2`,
      [bookId, userId],
    );
    const row = result.rows[0] as { rating: number } | undefined;
    return row ? row.rating : null;
  },

  async getAggregate(bookId: string): Promise<{ average: number; count: number }> {
    const result = await db.query(
      `SELECT COALESCE(AVG(rating), 0) AS average, COUNT(*)::int AS count
       FROM ratings WHERE book_id = $1`,
      [bookId],
    );
    const row = result.rows[0] as { average: string; count: number };
    return {
      average: Math.round(Number(row.average) * 10) / 10,
      count: Number(row.count ?? 0),
    };
  },

  async assertBookExists(bookId: string): Promise<void> {
    const result = await db.query("SELECT 1 FROM books WHERE id = $1", [bookId]);
    if (!result.rowCount || result.rowCount === 0) {
      throw new AppError("Book not found", 404);
    }
  },
};
