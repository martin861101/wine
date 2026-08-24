# Books AI tool layer

Books is the authenticated Wine & Chapters companion. The existing Supabase `ai-chat` Edge Function and Gemini function-calling loop remain the orchestrator; a bounded internal registry exposes predefined read-only research tools and whitelisted UI actions.

```text
Books widget -> ai-chat -> Gemini -> validated tool registry
                                  -> Open Library metadata
                                  -> Tavily current search
                                  -> safe webpage reader
                                  -> Supabase club context
                                  -> whitelisted UI actions
```

## Research tools

| Tool | Use |
| --- | --- |
| `get_club_context()` | Current/previous reads, events, polls, announcements, ratings, reviews, and member participation state. |
| `search_books({ query, author?, limit? })` | Known titles, authors, keywords, and structured bibliographic discovery through Open Library. Limits are validated from 1–10 and default to 5. |
| `get_book_details({ openLibraryKey?, isbn?, title?, author? })` | Richer work/edition metadata after a book is identified. Stable keys or ISBNs are preferred. |
| `search_web({ query, maxResults? })` | Current trends, popularity, recent releases, recommendations, and reader discussion through Tavily. Limits are 3–8 and default to 5. |
| `read_webpage({ url })` | Bounded readable text from a selected public search result after SSRF and redirect validation. |
| `show_book({ bookId })` | A normalized visual preview from the current book cache or an identified Open Library record. |
| `find_audio({ title, author? })` | A Spotify search destination; it never claims playback or availability. |
| `surprise_me()` | A non-repetitive Open Library result in the blind-date reveal card. |

Gemini chooses which primitive tools to combine. Known-title lookups should stay on structured metadata; current or sentiment-oriented questions should use web search; page reading is reserved for a promising source whose snippet is insufficient. Tool results preserve real source URLs.

## UI actions and safety

The existing navigation, widget, mood, toast, effect, audio, surprise, and book-preview actions remain unchanged in behavior. `ui/src/lib/ai-actions.ts` validates every returned action again before `AIActionHandler` can apply it. Arbitrary paths, selectors, scripts, styles, browser commands, and audio destinations are rejected.

Gemini declarations contain only its supported schema fields (`type`, `properties`, `required`, `enum`, `description`, and `items` where needed). Server-side validation separately enforces string lengths, integer limits, identifiers, ISBNs, URLs, timeouts, response sizes, and allowlists.

The webpage reader blocks localhost, local hostnames, IPv4 private/link-local/reserved destinations, private/link-local/local IPv6 destinations, unsupported schemes, credentials, unusual ports, unsafe redirects, oversized responses, and unsupported content types. It never returns raw HTML.

## Environment and deployment

Required Edge Function secrets:

```env
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash
TAVILY_API_KEY=...
CORS_ORIGIN=https://wineandchapters.co.za
```

Supabase supplies its service credentials to the functions. None of these values belongs in browser code or a `VITE_*` variable.

```sh
cd backend
supabase functions deploy ai-chat
supabase functions deploy open-library-search --no-verify-jwt
```

Verify a known-title lookup, current trend query, multi-tool recommendation, safe page read, Open Library member search, existing club-context action, and explicit rejection of localhost/private/file URLs after deployment.
