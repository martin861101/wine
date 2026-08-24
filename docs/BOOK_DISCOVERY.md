# Book discovery providers

Wine & Chapters has two complementary book-discovery paths:

- `open-library-search` powers the authenticated member search interface with normalized Open Library records.
- `ai-chat` lets Gemini compose Open Library metadata, Tavily web search, the safe webpage reader, and existing club-context tools.

## Structured metadata

Open Library is the only structured external book provider. The shared adapter at `backend/supabase/functions/_shared/open-library.ts` handles search, work and edition details, ISBNs, subjects, page counts, publication data, source links, and Open Library cover URLs. Search and detail results use a small five-minute in-memory cache when an Edge Function isolate remains warm.

The normalized search record uses stable Open Library work or edition keys and does not expose provider response payloads directly. Missing fields remain absent; the adapter does not invent descriptions, ISBNs, covers, page counts, or publication data.

## Current web research

The generic `search_web` AI tool calls Tavily's Search API with conservative result limits. It returns only title, URL, snippet, and source hostname. `TAVILY_API_KEY` is required server-side for this tool and must never be stored in a `VITE_*` variable.

The `read_webpage` tool can inspect a selected result. It accepts only public HTTP(S) pages, resolves hostnames before fetching, rejects private/internal IP ranges, validates every redirect, limits redirects and ports, applies an eight-second timeout, accepts only readable text content types, caps downloaded bytes, removes common page noise, and truncates extracted text.

## Member suggestions

The member portal invokes `open-library-search`, then stores a normalized suggestion snapshot in Supabase. Existing persisted suggestions and club books remain available even if an external provider is temporarily unavailable.

## Deployment

Configure the live-search secret and deploy both functions from `backend/`:

```sh
supabase secrets set TAVILY_API_KEY=...
supabase functions deploy ai-chat
supabase functions deploy open-library-search --no-verify-jwt
```

Open Library requires no secret. Supabase session validation and trusted-origin checks still run inside both functions.
