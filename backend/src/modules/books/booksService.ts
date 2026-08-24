import { db } from "../../db/db";
import { getBookProvider } from "../../integrations/books";
import type { BookSearchResult } from "../../integrations/books/BookProvider";
import { AppError } from "../../lib/errors";

export interface BookRow {
  id: string;
  external_provider: string | null;
  external_id: string | null;
  isbn: string | null;
  isbn_13: string | null;
  isbn_10: string | null;
  title: string;
  author: string | null;
  subtitle: string | null;
  description: string | null;
  cover_url: string | null;
  publisher: string | null;
  published_date: string | null;
  categories: string[];
  metadata: Record<string, unknown>;
  created_at: Date;
}

export function mapBookRow(row: Record<string, unknown>): BookRow {
  return {
    id: String(row.id),
    external_provider: row.external_provider ? String(row.external_provider) : null,
    external_id: row.external_id ? String(row.external_id) : null,
    isbn: row.isbn ? String(row.isbn) : null,
    isbn_13: row.isbn_13 ? String(row.isbn_13) : null,
    isbn_10: row.isbn_10 ? String(row.isbn_10) : null,
    title: String(row.title),
    author: row.author ? String(row.author) : null,
    subtitle: row.subtitle ? String(row.subtitle) : null,
    description: row.description ? String(row.description) : null,
    cover_url: row.cover_url ? String(row.cover_url) : null,
    publisher: row.publisher ? String(row.publisher) : null,
    published_date: row.published_date ? String(row.published_date) : null,
    categories: Array.isArray(row.categories)
      ? (row.categories as string[])
      : typeof row.categories === "string"
        ? (row.categories as string)
            .slice(1, -1)
            .split(",")
            .map((c) => c.trim())
        : [],
    metadata:
      row.metadata && typeof row.metadata === "object"
        ? (row.metadata as Record<string, unknown>)
        : {},
    created_at: new Date(String(row.created_at)),
  };
}

export function toApiBook(row: BookRow) {
  return {
    id: row.id || null,
    databaseId: row.id || null,
    externalProvider: row.external_provider,
    externalId: row.external_id,
    title: row.title,
    author: row.author,
    subtitle: row.subtitle,
    description: row.description,
    coverUrl: row.cover_url,
    publisher: row.publisher,
    publishedDate: row.published_date,
    isbn10: row.isbn_10,
    isbn13: row.isbn_13,
    categories: row.categories,
  };
}

/** Map an external search result into a BookRow shape so we can reuse toApiBook. */
export function mapSearchResultToRow(result: BookSearchResult): BookRow {
  return {
    id: "",
    external_provider: result.externalProvider,
    external_id: result.externalId,
    isbn: result.isbn13 ?? null,
    isbn_13: result.isbn13 ?? null,
    isbn_10: result.isbn10 ?? null,
    title: result.title,
    author: result.author || null,
    subtitle: result.subtitle ?? null,
    description: result.description ?? null,
    cover_url: result.coverUrl ?? null,
    publisher: result.publisher ?? null,
    published_date: result.publishedDate ?? null,
    categories: result.categories ?? [],
    metadata: result.metadata ?? {},
    created_at: new Date(),
  };
}

function upsertBook(result: BookSearchResult): Promise<{ id: string }> {
  return db
    .query(
      `INSERT INTO books (
         external_provider, external_id, isbn_13, isbn_10, title, author, subtitle,
         description, cover_url, publisher, published_date, categories, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT (external_provider, external_id) WHERE external_id IS NOT NULL
       DO UPDATE SET
         title = EXCLUDED.title,
         author = EXCLUDED.author,
         subtitle = EXCLUDED.subtitle,
         description = EXCLUDED.description,
         cover_url = EXCLUDED.cover_url,
         publisher = EXCLUDED.publisher,
         published_date = EXCLUDED.published_date,
         categories = EXCLUDED.categories,
         metadata = EXCLUDED.metadata,
         isbn_13 = COALESCE(EXCLUDED.isbn_13, books.isbn_13),
         isbn_10 = COALESCE(EXCLUDED.isbn_10, books.isbn_10)
       RETURNING id`,
      [
        result.externalProvider,
        result.externalId,
        result.isbn13 ?? null,
        result.isbn10 ?? null,
        result.title,
        result.author,
        result.subtitle ?? null,
        result.description ?? null,
        result.coverUrl ?? null,
        result.publisher ?? null,
        result.publishedDate ?? null,
        JSON.stringify(result.categories),
        JSON.stringify(result.metadata),
      ],
    )
    .then((r) => r.rows[0] as { id: string });
}

export const booksService = {
  async search(query: string): Promise<ReturnType<typeof toApiBook>[]> {
    const provider = getBookProvider();
    const results = await provider.searchBooks(query);
    return results.map((result) => toApiBook(mapSearchResultToRow(result)));
  },

  async getById(id: string): Promise<ReturnType<typeof toApiBook>> {
    const result = await db.query("SELECT * FROM books WHERE id = $1", [id]);
    const row = result.rows[0] as Record<string, unknown> | undefined;
    if (!row) throw new AppError("Book not found", 404);
    return toApiBook(mapBookRow(row));
  },

  /** Import external metadata into the books table (idempotent) and return the DB row. */
  async importExternal(result: BookSearchResult): Promise<ReturnType<typeof toApiBook>> {
    const { id } = await upsertBook(result);
    return this.getById(id);
  },

  /** Resolve a book by ID or by external (provider, id) pair. */
  async getForSelection(result: BookSearchResult): Promise<ReturnType<typeof toApiBook>> {
    const { id } = await upsertBook(result);
    return this.getById(id);
  },
};
