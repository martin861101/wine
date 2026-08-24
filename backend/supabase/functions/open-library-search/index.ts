import { assertTrustedOrigin, cleanText, corsHeaders, handleError, json } from "../_shared/http.ts";
import { searchOpenLibrary } from "../_shared/open-library.ts";
import { requireMember } from "../_shared/supabase.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") return json(request, { message: "Method not allowed." }, 405);

  try {
    assertTrustedOrigin(request);
    await requireMember(request);
    const body = (await request.json()) as Record<string, unknown>;
    const query = cleanText(body.query, "Search", 2, 160);
    const books = await searchOpenLibrary(query, { limit: 10 });
    const results = books.map((book) => ({
      externalProvider: "open-library",
      externalId: book.openLibraryKey,
      title: book.title,
      author: book.authors.join(", ") || "Unknown author",
      coverUrl: book.coverUrl,
      publishedDate: book.publishYear ? String(book.publishYear) : undefined,
      isbn10: book.isbn?.length === 10 ? book.isbn : undefined,
      isbn13: book.isbn?.length === 13 ? book.isbn : undefined,
      categories: book.subjects,
      metadata: {
        openLibraryKey: book.openLibraryKey,
        sourceUrl: book.sourceUrl,
        ...(book.pageCount ? { pageCount: book.pageCount } : {}),
      },
    }));
    return json(request, { results });
  } catch (error) {
    return handleError(request, error);
  }
});
