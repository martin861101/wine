import { HttpError } from "./http.ts";

const OPEN_LIBRARY_BASE_URL = "https://openlibrary.org";
const COVER_BASE_URL = "https://covers.openlibrary.org";
const REQUEST_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 5 * 60_000;

type CachedValue<T> = { expiresAt: number; value: T };

const searchCache = new Map<string, CachedValue<OpenLibraryBook[]>>();
const detailsCache = new Map<string, CachedValue<OpenLibraryBook>>();

type SearchDocument = {
  key?: string;
  title?: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  subject?: string[];
};

type KeyReference = { key?: string };

type WorkRecord = {
  key?: string;
  title?: string;
  description?: string | { value?: string };
  covers?: number[];
  subjects?: string[];
  authors?: Array<{ author?: KeyReference }>;
};

type EditionRecord = {
  key?: string;
  title?: string;
  authors?: KeyReference[];
  works?: KeyReference[];
  covers?: number[];
  isbn_10?: string[];
  isbn_13?: string[];
  number_of_pages?: number;
  publish_date?: string;
  publishers?: string[];
};

export type BookResult = {
  id: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  description?: string;
  isbn?: string;
  publishYear?: number;
  publishedDate?: string;
  pageCount?: number;
  subjects: string[];
  publisher?: string;
  openLibraryKey?: string;
  sourceUrl?: string;
};

export type OpenLibraryBook = BookResult & { openLibraryKey: string; sourceUrl: string };

export type BookDetailsInput = {
  openLibraryKey?: string;
  isbn?: string;
  title?: string;
  author?: string;
};

function cached<T>(cache: Map<string, CachedValue<T>>, key: string): T | undefined {
  const item = cache.get(key);
  if (!item) return undefined;
  if (item.expiresAt <= Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return item.value;
}

function remember<T>(cache: Map<string, CachedValue<T>>, key: string, value: T): T {
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  if (cache.size > 100) cache.delete(cache.keys().next().value as string);
  return value;
}

async function fetchJson<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${OPEN_LIBRARY_BASE_URL}${path}`, {
      headers: { Accept: "application/json", "User-Agent": "WineAndChapters/1.0" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new HttpError("Structured book lookup is temporarily unavailable.", 502);
  }
  if (response.status === 404) throw new HttpError("That book was not found.", 404);
  if (!response.ok) throw new HttpError("Structured book lookup is temporarily unavailable.", 502);
  try {
    return (await response.json()) as T;
  } catch {
    throw new HttpError("Structured book lookup returned an unreadable response.", 502);
  }
}

function normalizeWorkKey(value: string): string | undefined {
  const clean = value.trim();
  const match =
    clean.match(/^(?:https?:\/\/openlibrary\.org)?\/?works\/(OL\d+W)(?:\.json)?$/i) ??
    clean.match(/^(OL\d+W)$/i);
  return match?.[1] ? `/works/${match[1].toUpperCase()}` : undefined;
}

function normalizeEditionKey(value: string): string | undefined {
  const clean = value.trim();
  const match =
    clean.match(/^(?:https?:\/\/openlibrary\.org)?\/?books\/(OL\d+M)(?:\.json)?$/i) ??
    clean.match(/^(OL\d+M)$/i);
  return match?.[1] ? `/books/${match[1].toUpperCase()}` : undefined;
}

export function normalizeOpenLibraryKey(value: string): string | undefined {
  return normalizeWorkKey(value) ?? normalizeEditionKey(value);
}

export function normalizeIsbn(value: string): string | undefined {
  const isbn = value.replace(/[\s-]/g, "").toUpperCase();
  return /^(?:\d{9}[\dX]|\d{13})$/.test(isbn) ? isbn : undefined;
}

function coverUrl(coverId?: number, isbn?: string): string | undefined {
  if (Number.isSafeInteger(coverId) && Number(coverId) > 0) {
    return `${COVER_BASE_URL}/b/id/${coverId}-L.jpg`;
  }
  return isbn
    ? `${COVER_BASE_URL}/isbn/${encodeURIComponent(isbn)}-L.jpg?default=false`
    : undefined;
}

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

function descriptionText(value: WorkRecord["description"]): string | undefined {
  const text = typeof value === "string" ? value : value?.value;
  const clean = text?.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, 2_500) : undefined;
}

function sourceUrl(key: string): string {
  return `${OPEN_LIBRARY_BASE_URL}${key}`;
}

export async function searchOpenLibrary(
  query: string,
  options: { author?: string; limit?: number } = {},
): Promise<OpenLibraryBook[]> {
  const cleanQuery = query.trim();
  const cleanAuthor = options.author?.trim();
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 5), 1), 10);
  const cacheKey = `${cleanQuery.toLowerCase()}|${cleanAuthor?.toLowerCase() ?? ""}|${limit}`;
  const hit = cached(searchCache, cacheKey);
  if (hit) return hit;

  const params = new URLSearchParams({
    fields: "key,title,author_name,cover_i,isbn,first_publish_year,number_of_pages_median,subject",
    limit: String(limit),
  });
  if (cleanAuthor) {
    params.set("title", cleanQuery);
    params.set("author", cleanAuthor);
  } else {
    params.set("q", cleanQuery);
  }

  const payload = await fetchJson<{ docs?: SearchDocument[] }>(`/search.json?${params}`);
  const books = (payload.docs ?? []).flatMap((document): OpenLibraryBook[] => {
    const key = document.key ? normalizeOpenLibraryKey(document.key) : undefined;
    const title = document.title?.trim();
    if (!key || !title) return [];
    const isbn =
      uniqueStrings(document.isbn, 12).find((value) => /^\d{13}$/.test(value)) ??
      uniqueStrings(document.isbn, 12)[0];
    const cover = coverUrl(document.cover_i, isbn);
    return [
      {
        id: key,
        title,
        authors: uniqueStrings(document.author_name, 8),
        ...(cover ? { coverUrl: cover } : {}),
        ...(isbn ? { isbn } : {}),
        ...(Number.isSafeInteger(document.first_publish_year)
          ? { publishYear: document.first_publish_year }
          : {}),
        ...(Number.isSafeInteger(document.number_of_pages_median) &&
        Number(document.number_of_pages_median) > 0
          ? { pageCount: document.number_of_pages_median }
          : {}),
        subjects: uniqueStrings(document.subject, 12),
        openLibraryKey: key,
        sourceUrl: sourceUrl(key),
      },
    ];
  });
  return remember(searchCache, cacheKey, books);
}

async function authorNames(keys: Array<string | undefined>): Promise<string[]> {
  const uniqueKeys = [...new Set(keys.filter((key): key is string => Boolean(key)))].slice(0, 8);
  const records = await Promise.all(
    uniqueKeys.map(async (key) => {
      try {
        const author = await fetchJson<{ name?: string }>(`${key}.json`);
        return author.name?.trim();
      } catch {
        return undefined;
      }
    }),
  );
  return uniqueStrings(records, 8);
}

function preferredEdition(entries: EditionRecord[]): EditionRecord | undefined {
  return (
    entries.find(
      (entry) => entry.number_of_pages && (entry.isbn_13?.length || entry.isbn_10?.length),
    ) ??
    entries.find((entry) => entry.isbn_13?.length || entry.isbn_10?.length) ??
    entries.find((entry) => entry.number_of_pages) ??
    entries[0]
  );
}

async function detailsForWork(
  workKey: string,
  preferred?: EditionRecord,
): Promise<OpenLibraryBook> {
  const [work, editionsPayload] = await Promise.all([
    fetchJson<WorkRecord>(`${workKey}.json`),
    fetchJson<{ entries?: EditionRecord[] }>(`${workKey}/editions.json?limit=12`).catch(() => ({
      entries: [],
    })),
  ]);
  const edition = preferred ?? preferredEdition(editionsPayload.entries ?? []);
  const authors = await authorNames([
    ...(work.authors ?? []).map((item) => item.author?.key),
    ...(edition?.authors ?? []).map((item) => item.key),
  ]);
  const isbn = edition?.isbn_13?.[0] ?? edition?.isbn_10?.[0];
  const cover = coverUrl(work.covers?.[0] ?? edition?.covers?.[0], isbn);
  const description = descriptionText(work.description);
  const publishedDate = edition?.publish_date?.trim();
  const publishYearMatch = publishedDate?.match(/\b(\d{4})\b/);
  const publisher = edition?.publishers?.find((item) => item.trim())?.trim();
  const title = work.title?.trim() ?? edition?.title?.trim();
  if (!title) throw new HttpError("That book's structured record is incomplete.", 502);

  return {
    id: workKey,
    title,
    authors,
    ...(cover ? { coverUrl: cover } : {}),
    ...(description ? { description } : {}),
    ...(isbn ? { isbn } : {}),
    ...(publishYearMatch?.[1] ? { publishYear: Number(publishYearMatch[1]) } : {}),
    ...(publishedDate ? { publishedDate } : {}),
    ...(edition?.number_of_pages && edition.number_of_pages > 0
      ? { pageCount: edition.number_of_pages }
      : {}),
    subjects: uniqueStrings(work.subjects, 20),
    ...(publisher ? { publisher } : {}),
    openLibraryKey: workKey,
    sourceUrl: sourceUrl(workKey),
  };
}

async function detailsForEdition(editionKey: string): Promise<OpenLibraryBook> {
  const edition = await fetchJson<EditionRecord>(`${editionKey}.json`);
  const workKey = edition.works
    ?.map((item) => item.key)
    .find((key) => key && normalizeWorkKey(key));
  if (workKey) return detailsForWork(normalizeWorkKey(workKey)!, edition);

  const authors = await authorNames((edition.authors ?? []).map((item) => item.key));
  const isbn = edition.isbn_13?.[0] ?? edition.isbn_10?.[0];
  const cover = coverUrl(edition.covers?.[0], isbn);
  const title = edition.title?.trim();
  if (!title) throw new HttpError("That book's structured record is incomplete.", 502);
  return {
    id: editionKey,
    title,
    authors,
    ...(cover ? { coverUrl: cover } : {}),
    ...(isbn ? { isbn } : {}),
    ...(edition.number_of_pages && edition.number_of_pages > 0
      ? { pageCount: edition.number_of_pages }
      : {}),
    ...(edition.publish_date ? { publishedDate: edition.publish_date } : {}),
    subjects: [],
    ...(edition.publishers?.[0] ? { publisher: edition.publishers[0] } : {}),
    openLibraryKey: editionKey,
    sourceUrl: sourceUrl(editionKey),
  };
}

export async function getOpenLibraryDetails(input: BookDetailsInput): Promise<OpenLibraryBook> {
  const stableKey = input.openLibraryKey
    ? normalizeOpenLibraryKey(input.openLibraryKey)
    : undefined;
  const isbn = input.isbn ? normalizeIsbn(input.isbn) : undefined;
  const cacheKey = stableKey ?? (isbn ? `isbn:${isbn}` : undefined);
  if (cacheKey) {
    const hit = cached(detailsCache, cacheKey);
    if (hit) return hit;
  }

  let book: OpenLibraryBook;
  if (stableKey?.startsWith("/works/")) {
    book = await detailsForWork(stableKey);
  } else if (stableKey?.startsWith("/books/")) {
    book = await detailsForEdition(stableKey);
  } else if (isbn) {
    const edition = await fetchJson<EditionRecord>(`/isbn/${encodeURIComponent(isbn)}.json`);
    const editionKey = edition.key ? normalizeEditionKey(edition.key) : undefined;
    const workKey = edition.works
      ?.map((item) => item.key)
      .find((key) => key && normalizeWorkKey(key));
    book = workKey
      ? await detailsForWork(normalizeWorkKey(workKey)!, edition)
      : editionKey
        ? await detailsForEdition(editionKey)
        : (() => {
            throw new HttpError("That book's structured record is incomplete.", 502);
          })();
  } else if (input.title?.trim()) {
    const matches = await searchOpenLibrary(input.title, { author: input.author, limit: 1 });
    if (!matches[0]) throw new HttpError("That book was not found.", 404);
    book = await detailsForWork(matches[0].openLibraryKey);
  } else {
    throw new HttpError("Provide a book identifier, ISBN, or title.");
  }

  if (cacheKey) remember(detailsCache, cacheKey, book);
  remember(detailsCache, book.openLibraryKey, book);
  return book;
}
