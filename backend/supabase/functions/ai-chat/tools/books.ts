import {
  getOpenLibraryDetails,
  normalizeIsbn,
  normalizeOpenLibraryKey,
  searchOpenLibrary,
  type BookResult,
} from "../../_shared/open-library.ts";
import { HttpError } from "../../_shared/http.ts";

import type { BookPreview, RegisteredTool } from "./types.ts";
import { objectArgs, optionalInteger, optionalString, requiredString } from "./validation.ts";

function preview(book: BookResult): BookPreview {
  return {
    id: book.id,
    title: book.title,
    authors: book.authors,
    ...(book.coverUrl ? { cover: book.coverUrl } : {}),
    ...(book.description ? { description: book.description.slice(0, 800) } : {}),
    ...(book.publishedDate
      ? { publishedDate: book.publishedDate }
      : book.publishYear
        ? { publishedDate: String(book.publishYear) }
        : {}),
    categories: book.subjects.slice(0, 12),
    ...(book.isbn ? { isbn: book.isbn } : {}),
    ...(book.pageCount ? { pageCount: book.pageCount } : {}),
    ...(book.sourceUrl ? { sourceUrl: book.sourceUrl } : {}),
  };
}

export const searchBooksTool: RegisteredTool = {
  declaration: {
    name: "search_books",
    description:
      "Find books and structured bibliographic metadata by title, author, genre, or keywords. Best for known books and non-current discovery.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Title, genre, keywords, or other book query." },
        author: { type: "STRING", description: "Optional author name used to narrow the search." },
        limit: { type: "NUMBER", description: "Optional number of results from 1 to 10." },
      },
      required: ["query"],
    },
  },
  async execute(args, context) {
    const record = objectArgs(args);
    const query = requiredString(record, "query", 2, 200);
    const author = optionalString(record, "author", 140);
    const limit = optionalInteger(record, "limit", 1, 10, 5);
    const books = await searchOpenLibrary(query, { author, limit });
    books.forEach((book) => context.bookCache.set(book.id, book));
    return { output: { books } };
  },
};

export const getBookDetailsTool: RegisteredTool = {
  declaration: {
    name: "get_book_details",
    description:
      "Get richer structured metadata for one identified book. Prefer the openLibraryKey returned by search_books, or use an ISBN.",
    parameters: {
      type: "OBJECT",
      properties: {
        openLibraryKey: {
          type: "STRING",
          description: "Stable book key returned by search_books, such as /works/OL123W.",
        },
        isbn: { type: "STRING", description: "ISBN-10 or ISBN-13." },
        title: {
          type: "STRING",
          description: "Book title when no stable identifier is available.",
        },
        author: { type: "STRING", description: "Optional author paired with title." },
      },
    },
  },
  async execute(args, context) {
    const record = objectArgs(args);
    const rawKey = optionalString(record, "openLibraryKey", 180);
    const rawIsbn = optionalString(record, "isbn", 32);
    const title = optionalString(record, "title", 240);
    const author = optionalString(record, "author", 140);
    const openLibraryKey = rawKey ? normalizeOpenLibraryKey(rawKey) : undefined;
    const isbn = rawIsbn ? normalizeIsbn(rawIsbn) : undefined;
    if (rawKey && !openLibraryKey) throw new HttpError("Invalid Open Library key.");
    if (rawIsbn && !isbn) throw new HttpError("Invalid ISBN.");
    if (!openLibraryKey && !isbn && !title) {
      throw new HttpError("Provide a book key, ISBN, or title.");
    }
    const book = await getOpenLibraryDetails({ openLibraryKey, isbn, title, author });
    context.bookCache.set(book.id, book);
    return { output: { book } };
  },
};

export const showBookTool: RegisteredTool = {
  declaration: {
    name: "show_book",
    description:
      "Open a compact visual preview for a book returned by search_books or get_book_details. Prefer this over a long synopsis in chat.",
    parameters: {
      type: "OBJECT",
      properties: {
        bookId: { type: "STRING", description: "The normalized book id returned by a book tool." },
      },
      required: ["bookId"],
    },
  },
  async execute(args, context) {
    const bookId = requiredString(objectArgs(args), "bookId", 1, 180);
    let book = context.bookCache.get(bookId);
    if (!book && normalizeOpenLibraryKey(bookId)) {
      book = await getOpenLibraryDetails({ openLibraryKey: bookId });
      context.bookCache.set(book.id, book);
    }
    if (
      !book &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bookId)
    ) {
      const { data } = await context.client
        .from("books")
        .select("id,title,author,cover_url,description,published_date,categories,isbn_13,isbn_10")
        .eq("id", bookId)
        .maybeSingle();
      if (data) {
        book = {
          id: String(data.id),
          title: String(data.title),
          authors: data.author ? [String(data.author)] : [],
          ...(data.cover_url ? { coverUrl: String(data.cover_url) } : {}),
          ...(data.description ? { description: String(data.description) } : {}),
          ...(data.published_date ? { publishedDate: String(data.published_date) } : {}),
          ...(data.isbn_13 || data.isbn_10 ? { isbn: String(data.isbn_13 ?? data.isbn_10) } : {}),
          subjects: Array.isArray(data.categories)
            ? data.categories.filter((item): item is string => typeof item === "string")
            : [],
          sourceUrl: "https://wineandchapters.co.za/portal",
        };
      }
    }
    if (!book) throw new HttpError("Search for the book before showing it.");
    return {
      output: { displayed: true, bookId: book.id },
      action: { type: "SHOW_BOOK", bookId: book.id, book: preview(book) },
    };
  },
};

export const surpriseMeTool: RegisteredTool = {
  declaration: {
    name: "surprise_me",
    description:
      "Create a blind-date-with-a-book recommendation. Use sparingly when the member asks to be surprised.",
    parameters: { type: "OBJECT", properties: {} },
  },
  async execute(args, context) {
    objectArgs(args);
    const { data } = await context.client
      .from("club_books")
      .select("book:books(title,author,categories)")
      .order("start_date", { ascending: false })
      .limit(8);
    const priorTitles = (data ?? [])
      .map((row) => (row.book as { title?: string } | null)?.title)
      .filter((title): title is string => Boolean(title));
    const seeds = [
      "award winning women literary fiction",
      "page turning mystery novel women author",
      "romantic fantasy novel book club",
      "witty contemporary fiction women friendship",
    ];
    const seed = seeds[Math.floor(Math.random() * seeds.length)] ?? seeds[0];
    const books = await searchOpenLibrary(seed, { limit: 10 });
    const choice = books.find(
      (book) => !priorTitles.some((title) => title.toLowerCase() === book.title.toLowerCase()),
    );
    if (!choice) throw new HttpError("I could not find a fresh surprise just now.", 502);
    context.bookCache.set(choice.id, choice);
    const traits = [
      choice.subjects[0] ? `A touch of ${choice.subjects[0].toLowerCase()}.` : "A story with bite.",
      choice.description?.split(/[.!?]/)[0]?.trim()
        ? `${choice.description.split(/[.!?]/)[0]?.trim()}.`
        : "One irresistible premise.",
      "Best opened without spoilers.",
    ].join(" ");
    return {
      output: { selected: true, experience: "blind-date-with-a-book" },
      action: {
        type: "SHOW_BOOK",
        bookId: choice.id,
        book: preview(choice),
        blind: true,
        tease: traits.slice(0, 260),
      },
    };
  },
};
