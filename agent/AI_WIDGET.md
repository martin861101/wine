# Agent — Wine & Chapters Books Search Upgrade

Work against the **current Wine & Chapters repository**.

Upgrade the existing **Books AI widget/tool layer** so Google Books is removed completely and replaced with:

* Open Library for structured book discovery/metadata;
* real web search for current discovery/recommendations/research;
* safe webpage reading for deeper research;
* Gemini as the orchestrator deciding which tools to combine.

This is an extension of the existing Books/Gemini tool architecture.

**Do not rewrite `ai-chat` from scratch.**

The existing Gemini function-calling implementation is now working and must remain stable.

---

# 1. PRIMARY GOAL

Books should no longer behave like a Google Books search wrapper.

It should behave like an intelligent book-club companion capable of handling queries such as:

* "Find The Push by Ashley Audrain."
* "Find something similar to Crown Me Dead."
* "What thrillers are popular with book clubs right now?"
* "Find us something under 400 pages that will cause an argument."
* "What books are trending at the moment?"
* "Would this make a good Wine & Chapters monthly read?"
* "Find something romantic but not too spicy."
* "What are people saying about this book?"
* "Give me three dark romance recommendations."
* "Find a good audiobook for a road trip."

Books should choose between structured book data, current web research and Wine & Chapters context depending on the request.

---

# 2. REMOVE GOOGLE BOOKS COMPLETELY

Google Books must fall away entirely.

Search the repository for all Google Books integrations and remove them cleanly.

This includes, where applicable:

* Google Books API calls;
* Google Books-specific functions;
* Google Books-specific tool declarations;
* Google Books response parsing;
* Google Books types;
* Google Books URLs;
* Google Books API keys;
* environment variable references;
* configuration;
* documentation;
* README instructions;
* obsolete comments.

Do NOT leave Google Books as a fallback.

Do NOT implement:

`Open Library → Google Books fallback`

The new architecture is:

```text
Books / Gemini
      │
      ├── Open Library
      │      structured book discovery
      │      metadata
      │      editions
      │      ISBN
      │      covers
      │
      ├── Web Search
      │      trends
      │      recommendations
      │      current information
      │      reader discussion
      │
      ├── Webpage Reader
      │      deeper inspection of selected sources
      │
      └── Wine & Chapters tools/data
             current read
             events
             reviews
             existing club context
```

Before deleting anything, verify it isn't used by unrelated functionality.

---

# 3. PRESERVE THE WORKING GEMINI IMPLEMENTATION

The current Supabase Edge Function:

`backend/supabase/functions/ai-chat/`

already has working Gemini function calling.

Preserve:

* Gemini authentication;
* Gemini request/response loop;
* function calling;
* tool execution;
* diagnostic Gemini error logging;
* current 429 handling;
* Books system/personality prompt structure;
* existing Wine & Chapters tools;
* existing UI action tools;
* navigation;
* moods/effects;
* audio functionality;
* surprise functionality;
* security validation.

Do NOT reintroduce the recently fixed Gemini schema problem.

Remember:

Gemini's `functionDeclarations[].parameters` must only contain supported schema fields.

Do NOT add:

```ts
additionalProperties: false
```

to the model-facing Gemini schemas.

Strict validation can remain server-side.

---

# 4. OPEN LIBRARY

Use Open Library as the structured book provider.

Official API:

`https://openlibrary.org`

No Google Books dependency should remain.

Create a clean provider abstraction rather than scattering Open Library requests throughout `ai-chat`.

Suggested structure — adapt to the current repository rather than forcing this exact tree:

```text
backend/supabase/functions/ai-chat/
│
├── index.ts
│
└── tools/
    ├── registry.ts
    ├── execute.ts
    │
    ├── books/
    │   ├── open-library.ts
    │   ├── search.ts
    │   └── details.ts
    │
    └── web/
        ├── search.ts
        ├── read.ts
        └── safety.ts
```

Reuse existing structure where appropriate.

Do not reorganise unrelated tools just to match this example.

---

# 5. `search_books`

Add/refactor the Books search tool into a provider-independent tool:

```text
search_books
```

The AI should NOT need to know that Open Library is underneath it.

Suggested arguments:

```ts
{
  query: string;
  author?: string;
  limit?: number;
}
```

Keep the Gemini declaration simple and compatible.

Server-side limit:

approximately 1–10 results.

Default:

approximately 5.

## Open Library search

Use the Open Library Search API.

Retrieve useful structured fields rather than unnecessarily requesting massive records.

Normalize results.

Suggested internal shape:

```ts
type BookResult = {
  id: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  isbn?: string;
  publishYear?: number;
  pageCount?: number;
  subjects?: string[];
  openLibraryKey?: string;
  sourceUrl?: string;
};
```

Do not return undefined/garbage values merely to satisfy the shape.

---

# 6. BOOK COVERS

Use Open Library's cover system.

Prefer stable identifiers such as:

* cover ID;
* ISBN;

depending on the returned record.

Generate appropriate Open Library cover URLs server-side.

Provide a sensible fallback when no cover exists.

Do not use Google Books cover URLs anywhere after this migration.

---

# 7. `get_book_details`

Add/refactor:

```text
get_book_details
```

Purpose:

Retrieve richer structured information for a selected book.

Suggested input:

```ts
{
  openLibraryKey?: string;
  isbn?: string;
  title?: string;
  author?: string;
}
```

Prefer stable Open Library identifiers when already available from `search_books`.

Return only useful data.

Potential information:

* title;
* author;
* description;
* cover;
* subjects/genres;
* publication information;
* editions where useful;
* ISBN;
* page count where available;
* Open Library URL.

Open Library metadata can be incomplete.

Do NOT fabricate missing values.

Gemini can use web research when Open Library lacks information.

---

# 8. ADD REAL WEB SEARCH

Add:

```text
search_web
```

This is a major capability upgrade.

Books should use web search when the user asks about:

* trends;
* current popularity;
* recommendations;
* recent releases;
* reader sentiment;
* BookTok/online discussion;
* book-club suitability;
* comparisons;
* current information;
* information Open Library cannot provide.

Suggested Gemini input:

```ts
{
  query: string;
  maxResults?: number;
}
```

Server-side enforce a small result limit.

Approximately:

`3–8`

results.

Return normalized results:

```ts
{
  title: string;
  url: string;
  snippet?: string;
  source?: string;
}
```

---

# 9. WEB SEARCH PROVIDER — TAVILY

Tavily has been selected as the web-search provider for Books.

The Supabase secret has already been configured as:

`TAVILY_API_KEY`

Do NOT introduce Brave Search, Serper, Google Search scraping, or another search provider.

Implement the existing proposed:

`search_web`

tool using Tavily.

## Architecture

Keep Tavily behind the generic Books tool:

```text
Books / Gemini
      ↓
search_web()
      ↓
Tavily
```

Gemini should only know about `search_web`, not Tavily-specific implementation details.

This allows the underlying provider to be changed later without changing Gemini's tool contract.

## Tavily integration

Read the key server-side only:

```ts
const tavilyApiKey = Deno.env.get("TAVILY_API_KEY");
```

Never expose it to the frontend.

Never return it in tool results.

Never log it.

Never commit it.

Use Tavily's current supported search API and normalize the response before returning it to Gemini.

The normalized result should remain provider-independent, approximately:

```ts
type WebSearchResult = {
  title: string;
  url: string;
  snippet?: string;
  source?: string;
};
```

Do not pass Tavily's entire raw response into Gemini.

Return only the fields Books needs.

## Search behaviour

Use Tavily for queries involving:

* current book trends;
* recent releases;
* book-club recommendations;
* reader sentiment;
* online discussion;
* current popularity;
* BookTok/Bookstagram-style discovery;
* current author/book information;
* information unavailable or incomplete in Open Library.

Keep result counts conservative.

Default approximately:

`5`

Maximum approximately:

`8`

Do not perform web search unnecessarily for simple structured title/author lookups that Open Library can answer.

## Relationship with Open Library

The intended responsibilities are:

```text
search_books
    ↓
Open Library
    ↓
structured metadata

search_web
    ↓
Tavily
    ↓
current discovery/research

read_webpage
    ↓
safe server-side page reader
    ↓
deeper inspection when necessary
```

Gemini may combine these tools.

Example:

User:

`Find something similar to Crown Me Dead that's popular right now.`

Possible flow:

```text
search_web
    ↓
Tavily identifies candidates/current discussion
    ↓
search_books
    ↓
Open Library enriches candidates
    ↓
Gemini recommendation
```

## Error handling

If `TAVILY_API_KEY` is unavailable, return a controlled tool error.

Do not crash the entire `ai-chat` request.

If Tavily:

* times out;
* returns 429;
* returns 5xx;
* returns malformed data;

return a clean tool failure that Gemini can handle conversationally.

Do not expose Tavily's credentials or internal response details to the end user.

## Deployment

After implementation:

1. Run backend typecheck.
2. Confirm `TAVILY_API_KEY` is referenced only server-side.
3. Confirm no key value exists in source control.
4. Deploy `ai-chat`.
5. Test:

`What thrillers are popular with book clubs right now?`

6. Confirm `search_web` invokes Tavily.
7. Confirm Gemini receives normalized search results.
8. Confirm Books produces a conversational answer.
9. Test a normal known-title lookup and confirm it uses Open Library rather than unnecessarily invoking Tavily.


---

# 10. `read_webpage`

Add:

```text
read_webpage
```

Purpose:

Allow Books to inspect a useful result discovered through `search_web`.

Suggested input:

```ts
{
  url: string;
}
```

The server should:

1. validate URL;
2. fetch page;
3. enforce timeout;
4. enforce response size;
5. verify content type;
6. extract useful readable text;
7. remove obvious HTML/navigation/script noise;
8. truncate output to a safe size;
9. return source metadata.

Do NOT send enormous raw HTML documents back to Gemini.

Return something approximately like:

```ts
{
  title?: string;
  url: string;
  text: string;
}
```

---

# 11. SSRF / WEB READER SECURITY

`read_webpage` MUST have strict server-side URL protection.

This is mandatory.

Only allow:

```text
http:
https:
```

Block localhost/private/internal destinations.

At minimum block:

```text
localhost
127.0.0.0/8
0.0.0.0
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
169.254.0.0/16
::1
private/local IPv6 ranges
```

Also reject:

```text
file:
ftp:
data:
javascript:
```

Validate redirect destinations as well.

Do not allow a public URL to redirect into a private network.

Add:

* request timeout;
* redirect limit;
* response size limit;
* supported content-type checks.

Keep server-side tool argument validation strict.

---

# 12. NO PLAYWRIGHT IN THIS PHASE

Do NOT add Playwright yet.

Do NOT attempt to run Chromium inside the Supabase Edge Function.

The current phase is:

```text
Open Library
+
Web Search
+
Webpage Reader
+
Gemini
```

Browser automation can be added later through a separate service when required for dynamic retailers, availability or price comparison.

Keep this implementation lightweight.

---

# 13. LET GEMINI ORCHESTRATE

Do NOT create a rigid `research_book` workflow that always runs all providers.

Gemini should compose the primitive tools.

Example:

### Known title

User:

`Tell me about The Push by Ashley Audrain.`

Likely flow:

```text
search_books
      ↓
get_book_details
      ↓
answer
```

### Current recommendation

User:

`What thrillers are popular with book clubs right now?`

Likely:

```text
search_web
      ↓
identify candidates
      ↓
search_books
      ↓
answer
```

### Deeper research

User:

`Would The Push be good for Wine & Chapters?`

Possible:

```text
search_books
      +
search_web
      ↓
read_webpage on useful sources
      ↓
Wine & Chapters context
      ↓
Gemini synthesis
```

Do not force every question through every tool.

---

# 14. UPDATE BOOKS SYSTEM INSTRUCTIONS

Update the Books system prompt/tool instructions so Gemini understands the new responsibilities.

Conceptually:

### `search_books`

Use for:

* known titles;
* authors;
* structured book discovery;
* bibliographic metadata.

### `get_book_details`

Use after identifying a specific Open Library book when richer metadata is useful.

### `search_web`

Use for:

* current information;
* trends;
* recommendations;
* reader discussion;
* popularity;
* recent releases;
* questions Open Library cannot answer.

### `read_webpage`

Use when a web-search result appears useful and the answer requires information beyond its search snippet.

Gemini may combine tools.

Do not make web search mandatory for ordinary known-title queries.

---

# 15. WINE & CHAPTERS CONTEXT

Preserve the existing Wine & Chapters-specific tools.

Books should be capable of combining external research with club context.

For example:

User:

`Find something for next month's club that's different from what we've been reading.`

Books should ideally consider existing Wine & Chapters data/history where the current tool layer makes that available.

Do not unnecessarily duplicate club APIs inside the book provider.

---

# 16. SOURCES

For web-researched answers, preserve source URLs in the tool result so Gemini can reference where current claims came from.

Do not invent sources.

Do not claim web research occurred unless `search_web`/`read_webpage` actually ran.

Open Library structured metadata can identify itself through its Open Library source URL.

---

# 17. FAILURE HANDLING

Books should degrade gracefully.

### Open Library unavailable

Do not crash the whole chat.

Return a useful tool error so Gemini can explain that structured book lookup is temporarily unavailable or use web search where appropriate.

### Web search unavailable

Structured Open Library searches should continue working.

### Webpage blocked/unreadable

Return a clean error such as:

```text
Page could not be read.
```

Gemini can choose another search result.

Do not expose stack traces or provider credentials to the user.

---

# 18. TIMEOUTS

External calls must have sensible timeouts.

Do not allow a single search/read operation to hang the Supabase Edge Function indefinitely.

Keep Books responsive.

---

# 19. CACHING

If a simple existing caching mechanism is available, use reasonable short-lived caching for repeated Open Library searches/details.

Do not introduce major infrastructure just for caching.

Web search should favour freshness where the query is explicitly current.

---

# 20. REMOVE GOOGLE BOOKS FROM FRONTEND TOO

Search the frontend for Google Books assumptions.

Remove/replace:

* Google Books links;
* Google Books IDs;
* Google Books-specific types;
* Google Books attribution;
* Google Books cover assumptions;
* hardcoded Google Books URLs.

Do not break existing Books UI cards/actions.

Map the normalized Open Library result into the current frontend book presentation.

---

# 21. EXISTING `show_book` EXPERIENCE

If Books currently has a `show_book` UI/action tool, adapt it to accept the normalized book representation rather than Google-specific data.

The frontend should not care whether structured metadata came from Open Library.

Keep the current Wine & Chapters styling.

---

# 22. TOOL DECLARATION COMPATIBILITY

We recently fixed Gemini rejecting:

```text
additionalProperties
```

in function declarations.

Audit all NEW Gemini tool schemas before deployment.

Use only Gemini-supported schema constructs such as:

```text
type
properties
required
enum
description
items
```

where appropriate.

Do NOT blindly pass full JSON Schema/Zod-generated schemas to Gemini.

Model-facing schema and server-side validation should remain separate.

---

# 23. SERVER-SIDE VALIDATION

Even though Gemini schemas must remain simple, tool execution must validate arguments independently.

Validate:

* query lengths;
* result limits;
* URLs;
* Open Library identifiers;
* ISBN format where relevant;
* content size;
* timeouts.

Never trust model-generated arguments solely because Gemini produced them.

---

# 24. KEEP BOOKS PERSONALITY

Do not make Books sound like a search engine.

The tools provide information.

Gemini/Books should still respond conversationally in the established Wine & Chapters personality.

For example, not:

`5 results found.`

Prefer something like:

`Oh, I found three that could make the next meetup interesting...`

Then present useful structured results.

Do not overdo personality at the expense of useful information.

---

# 25. REMOVE OBSOLETE GOOGLE CONFIG

After implementation, search the entire repository for terms such as:

```text
GOOGLE_BOOKS
google books
Google Books
books.googleapis.com
googleapis.com/books
volumeId
```

Determine whether each remaining occurrence is genuinely unrelated.

Remove obsolete book-specific configuration.

Update:

* `.env.example`;
* Supabase secret documentation;
* README;
* implementation docs;
* changelog where appropriate.

Never commit real secrets.

---

# 26. TEST CASES

Test at least these scenarios.

### Structured title lookup

```text
Find The Push by Ashley Audrain.
```

Expected:

Open Library tool usage and useful structured result.

### Author lookup

```text
Show me books by Freida McFadden.
```

Expected:

Open Library search.

### Similar recommendation

```text
Find something similar to Crown Me Dead.
```

Expected:

Gemini may combine web discovery + Open Library.

### Current discovery

```text
What thrillers are popular with book clubs right now?
```

Expected:

web search, not merely Open Library.

### Research

```text
Would The Push make a good book club read?
```

Expected:

structured data plus web research where useful.

### Club-oriented query

```text
Find us something under 400 pages that people will argue about.
```

Expected:

agentic discovery rather than literal title search.

### Missing book

Test an obscure title.

Books should recover gracefully.

### Bad webpage

Test `read_webpage` against an inaccessible/unsupported URL.

It must fail safely.

### SSRF

Explicitly verify that `read_webpage` rejects:

```text
http://localhost
http://127.0.0.1
http://192.168.1.1
file:///etc/passwd
```

and equivalent private/internal destinations.

---

# 27. DEPLOYMENT

After implementation:

1. Run backend typecheck.
2. Run frontend typecheck/build if frontend code changed.
3. Verify no Google Books-specific code remains.
4. Verify no real secrets are committed.
5. Add any NEW required search-provider secret through Supabase secrets.
6. Deploy `ai-chat`.
7. Confirm Edge Function is ACTIVE.
8. Test normal conversation.
9. Test Open Library search.
10. Test web search.
11. Test webpage reading.
12. Test a multi-tool recommendation query.
13. Confirm existing Wine & Chapters tools still work.
14. Confirm existing Books UI actions still work.
15. Confirm Gemini returns no function-schema `400 INVALID_ARGUMENT` errors.
16. Report deployed Edge Function version and any new required environment variables.

---

# FINAL ARCHITECTURE

The target should be:

```text
                         ┌──────────────────┐
                         │   Open Library   │
                         │ books / metadata │
                         └────────┬─────────┘
                                  │
                                  │
┌──────────┐             ┌────────▼─────────┐
│   User   │────────────▶│  Books / Gemini  │
└──────────┘             │   Orchestrator   │
                         └────────┬─────────┘
                                  │
               ┌──────────────────┼─────────────────┐
               │                  │                 │
               ▼                  ▼                 ▼
         Web Search        Webpage Reader     W&C Internal
         current info      deeper research    tools/context
```

Google Books must not exist anywhere in this book-search path.

Do not add Playwright in this phase.

Keep the implementation modular enough that a separate Playwright/browser service can be added later without redesigning the Books tool architecture.

Make the implementation directly in the current repository and preserve unrelated working functionality.
