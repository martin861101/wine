import type { BookProvider, BookSearchResult } from "./BookProvider";

const BASE_URL = "https://openlibrary.org";
const COVER_URL = "https://covers.openlibrary.org";

type SearchDocument = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
  first_publish_year?: number;
  subject?: string[];
};

type WorkRecord = {
  key?: string;
  title?: string;
  description?: string | { value?: string };
  covers?: number[];
  subjects?: string[];
};

function uniqueStrings(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].slice(0, limit);
}

function normalizeWorkKey(value: string): string | null {
  const match = value.trim().match(/^(?:\/works\/)?(OL\d+W)$/i);
  return match?.[1] ? `/works/${match[1].toUpperCase()}` : null;
}

function coverUrl(coverId?: number, isbn?: string): string | undefined {
  if (Number.isSafeInteger(coverId) && Number(coverId) > 0) {
    return `${COVER_URL}/b/id/${coverId}-L.jpg`;
  }
  return isbn ? `${COVER_URL}/isbn/${encodeURIComponent(isbn)}-L.jpg?default=false` : undefined;
}

function mapSearchDocument(document: SearchDocument): BookSearchResult | null {
  const key = document.key ? normalizeWorkKey(document.key) : null;
  const title = document.title?.trim();
  if (!key || !title) return null;
  const isbns = uniqueStrings(document.isbn, 12);
  const isbn13 = isbns.find((isbn) => /^\d{13}$/.test(isbn));
  const isbn10 = isbns.find((isbn) => /^\d{9}[\dX]$/.test(isbn));
  const cover = coverUrl(document.cover_i, isbn13 ?? isbn10);
  return {
    externalProvider: "open-library",
    externalId: key,
    title,
    author: uniqueStrings(document.author_name, 8).join(", ") || "Unknown",
    ...(isbn10 ? { isbn10 } : {}),
    ...(isbn13 ? { isbn13 } : {}),
    ...(document.first_publish_year ? { publishedDate: String(document.first_publish_year) } : {}),
    categories: uniqueStrings(document.subject, 12),
    ...(cover ? { coverUrl: cover } : {}),
    metadata: { openLibraryKey: key, sourceUrl: `${BASE_URL}${key}` },
  };
}

export class OpenLibraryProvider implements BookProvider {
  async searchBooks(query: string): Promise<BookSearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      limit: "20",
      fields: "key,title,author_name,cover_i,isbn,first_publish_year,subject",
    });
    const response = await fetch(`${BASE_URL}/search.json?${params}`, {
      headers: { Accept: "application/json", "User-Agent": "WineAndChapters/1.0" },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Book search failed: HTTP ${response.status}`);
    const data = (await response.json()) as { docs?: SearchDocument[] };
    return (data.docs ?? [])
      .map(mapSearchDocument)
      .filter((book): book is BookSearchResult => Boolean(book));
  }

  async getBook(id: string): Promise<BookSearchResult | null> {
    const key = normalizeWorkKey(id);
    if (!key) return null;
    const response = await fetch(`${BASE_URL}${key}.json`, {
      headers: { Accept: "application/json", "User-Agent": "WineAndChapters/1.0" },
      signal: AbortSignal.timeout(8_000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`Book lookup failed: HTTP ${response.status}`);
    const work = (await response.json()) as WorkRecord;
    const title = work.title?.trim();
    if (!title) return null;
    const descriptionValue =
      typeof work.description === "string" ? work.description : work.description?.value;
    const description = descriptionValue?.replace(/\s+/g, " ").trim();
    const cover = coverUrl(work.covers?.[0]);
    return {
      externalProvider: "open-library",
      externalId: key,
      title,
      author: "Unknown",
      ...(description ? { description: description.slice(0, 2_500) } : {}),
      categories: uniqueStrings(work.subjects, 20),
      ...(cover ? { coverUrl: cover } : {}),
      metadata: { openLibraryKey: key, sourceUrl: `${BASE_URL}${key}` },
    };
  }
}
