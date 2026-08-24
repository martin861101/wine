import { db, withTransaction } from "../../db/db";
import { AppError } from "../../lib/errors";
import type { BookSearchResult } from "../../integrations/books/BookProvider";
import { booksService } from "../books/booksService";
import { ratingsService } from "../ratings/ratingsService";
import { reviewsService } from "../reviews/reviewsService";

export interface CurrentBookResult {
  id: string;
  book: {
    id: string;
    title: string;
    author: string | null;
    subtitle: string | null;
    description: string | null;
    coverUrl: string | null;
    publisher: string | null;
    publishedDate: string | null;
    isbn10: string | null;
    isbn13: string | null;
    categories: string[];
  };
  startDate: string;
  endDate: string;
  status: string;
  averageRating: number;
  ratingCount: number;
  reviews: number;
  myRating: number | null;
  progressPercent: number;
}

const BOOK_SELECT_COLUMNS = `
  b.id AS book_id, b.title, b.author, b.subtitle, b.description, b.cover_url,
  b.publisher, b.published_date, b.isbn_10, b.isbn_13, b.categories
`;

export const clubBooksService = {
  async setCurrentByBookId(
    bookId: string,
    startDate: string,
    endDate: string,
    selectedBy: string,
  ): Promise<{ id: string }> {
    if (endDate <= startDate)
      throw new AppError("The reading period must end after it starts.", 400);
    const book = await db.query("SELECT 1 FROM books WHERE id = $1", [bookId]);
    if (!book.rowCount) throw new AppError("Book not found", 404);
    return withTransaction(async (client) => {
      await client.query(`UPDATE club_books SET status = 'PAST' WHERE status = 'CURRENT'`);
      const inserted = await client.query(
        `INSERT INTO club_books (book_id, start_date, end_date, selected_by, status)
         VALUES ($1, $2, $3, $4, 'CURRENT') RETURNING id`,
        [bookId, startDate, endDate, selectedBy],
      );
      return inserted.rows[0] as { id: string };
    });
  },

  async setCurrent(
    bookResult: BookSearchResult,
    startDate: string,
    endDate: string,
    selectedBy: string,
  ): Promise<{ id: string }> {
    if (endDate <= startDate)
      throw new AppError("The reading period must end after it starts.", 400);
    const book = await booksService.getForSelection(bookResult);
    return withTransaction(async (client) => {
      await client.query(`UPDATE club_books SET status = 'PAST' WHERE status = 'CURRENT'`);
      const inserted = await client.query(
        `INSERT INTO club_books (book_id, start_date, end_date, selected_by, status)
         VALUES ($1, $2, $3, $4, 'CURRENT')
         RETURNING id`,
        [book.id, startDate, endDate, selectedBy],
      );
      return inserted.rows[0] as { id: string };
    });
  },

  async getCurrent(): Promise<CurrentBookResult> {
    const result = await db.query(
      `SELECT cb.id AS club_book_id, cb.start_date, cb.end_date, cb.status, cb.progress_percent,
              ${BOOK_SELECT_COLUMNS}
       FROM club_books cb
       JOIN books b ON b.id = cb.book_id
       WHERE cb.status = 'CURRENT'
       ORDER BY cb.created_at DESC
       LIMIT 1`,
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new AppError("No current book has been selected yet.", 404, "NO_CURRENT_BOOK");

    const book = {
      id: String(row.book_id),
      title: String(row.title),
      author: row.author ? String(row.author) : null,
      subtitle: row.subtitle ? String(row.subtitle) : null,
      description: row.description ? String(row.description) : null,
      coverUrl: row.cover_url ? String(row.cover_url) : null,
      publisher: row.publisher ? String(row.publisher) : null,
      publishedDate: row.published_date ? String(row.published_date) : null,
      isbn10: row.isbn_10 ? String(row.isbn_10) : null,
      isbn13: row.isbn_13 ? String(row.isbn_13) : null,
      categories: Array.isArray(row.categories) ? row.categories : [],
    };

    const aggregate = await ratingsService.getAggregate(String(row.book_id));
    return {
      id: String(row.club_book_id),
      book,
      startDate: row.start_date ? String(row.start_date) : "",
      endDate: row.end_date ? String(row.end_date) : "",
      status: String(row.status),
      averageRating: aggregate.average,
      ratingCount: aggregate.count,
      reviews: 0,
      myRating: null,
      progressPercent: Number(row.progress_percent ?? 0),
    };
  },

  async getWithMyRating(userId?: string): Promise<CurrentBookResult | null> {
    try {
      const current = await this.getCurrent();
      if (userId) {
        current.myRating = await ratingsService.getUserRating(userId, current.book.id);
      }
      const count = await reviewsService.countPublished(current.book.id);
      current.reviews = count;
      return current;
    } catch (error) {
      if (error instanceof AppError && error.code === "NO_CURRENT_BOOK") return null;
      throw error;
    }
  },

  async getHistory(): Promise<Array<Record<string, unknown>>> {
    const result = await db.query(
      `SELECT cb.id AS club_book_id, cb.start_date, cb.end_date, cb.status,
              b.id AS book_id, b.title, b.author, b.subtitle, b.cover_url, b.description,
              b.publisher, b.published_date
       FROM club_books cb
       JOIN books b ON b.id = cb.book_id
       ORDER BY cb.start_date DESC`,
    );
    return Promise.all(
      result.rows.map(async (row: Record<string, unknown>) => {
        const aggregate = await ratingsService.getAggregate(String(row.book_id));
        const reviews = await reviewsService.getForBook(String(row.book_id), undefined, 0, 3);
        return {
          clubBookId: String(row.club_book_id),
          book: {
            id: String(row.book_id),
            title: String(row.title),
            author: row.author ? String(row.author) : null,
            subtitle: row.subtitle ? String(row.subtitle) : null,
            coverUrl: row.cover_url ? String(row.cover_url) : null,
            description: row.description ? String(row.description) : null,
            publisher: row.publisher ? String(row.publisher) : null,
            publishedDate: row.published_date ? String(row.published_date) : null,
          },
          readingPeriod: {
            startDate: row.start_date ? String(row.start_date) : "",
            endDate: row.end_date ? String(row.end_date) : "",
          },
          status: String(row.status),
          averageRating: aggregate.average,
          ratingCount: aggregate.count,
          reviews: reviews.map((r) => ({
            id: r.id,
            title: r.title,
            author: r.authorName,
            createdAt: r.createdAt,
          })),
          selectedDate: row.start_date ? String(row.start_date) : "",
        };
      }),
    );
  },

  async updateProgress(progressPercent: number) {
    const result = await db.query(
      `UPDATE club_books SET progress_percent = $1, updated_at = now()
       WHERE status = 'CURRENT'
       RETURNING id, progress_percent`,
      [progressPercent],
    );
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new AppError("No current book has been selected yet.", 404, "NO_CURRENT_BOOK");
    return { id: String(row.id), progressPercent: Number(row.progress_percent) };
  },
};
