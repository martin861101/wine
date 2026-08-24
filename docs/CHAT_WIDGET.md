# Chat Widget

> Repository layout note: browser component paths are rooted at `ui/`; API and service paths are rooted at `backend/`.

## Status

The floating widget is a mock test/demo. The current AI integration is in development and the widget does not send messages to Gemini or the application API.

## Location

- Component: `src/components/site/demo-chat-widget.tsx`
- Shared layout: `src/routes/__root.tsx`
- Visible on the public site and member pages as a floating button in the lower-right corner. The wrapper uses an explicit fixed position and high stacking order so the control remains visible above page artwork and layout layers.

## Behaviour

- Opens and closes a themed reading-room panel.
- Uses a translucent, strongly blurred glass surface for the chat panel so page artwork and text behind it are subdued without losing the themed glass effect. The theme-aware inline background and blur fallback prevents the panel from becoming transparent when a stylesheet is stale or incomplete.
- Displays a clear demo status notice.
- Offers sample prompts for discussion questions, wine pairings, and reading suggestions.
- Generates local mock replies based on keywords.
- Does not require authentication or external credentials.

## Backend integration

The production chat path is deliberately server-side:

```text
Browser
  -> POST /api/ai/discuss
  -> requireAuth middleware
  -> aiRateLimit middleware
  -> Zod request validation
  -> aiService.discuss()
  -> PostgreSQL book lookup
  -> GeminiProvider.generate()
  -> JSON reply
```

### 1. Client request

The future live widget must send an authenticated JSON request to the same-origin API:

```http
POST /api/ai/discuss
Content-Type: application/json

{
  "bookId": "<PostgreSQL book UUID>",
  "message": "What are the main themes in this book?"
}
```

The `bookId` comes from `GET /api/widget/home` at `currentBook.book.id` or from `GET /api/club-books/current`. The existing API client sends cookies with requests, so the browser does not need to read or manage JWT values directly.

### 2. Authentication and rate limiting

The route is defined in `src/routes/api/ai/discuss.ts` with two server middleware layers:

- `requireAuth` reads the HttpOnly access cookie or an optional Bearer token, verifies the JWT, loads the user from PostgreSQL, and requires both `email_verified = true` and `approved = true`.
- `aiRateLimit` allows 20 AI requests per IP address per 60-second window. The current limiter is in-memory and is suitable for one development process; production deployments with multiple instances should move the bucket store to shared infrastructure such as Redis.

Unauthenticated requests return HTTP `401`. Requests over the limit return HTTP `429` with code `RATE_LIMITED`.

### 3. Validation

The route validates the body before invoking the AI service:

- `bookId`: required UUID.
- `message`: trimmed, required, maximum 2,000 characters.

Invalid JSON or invalid input returns HTTP `400` with the application error shape:

```json
{
  "message": "...",
  "code": "VALIDATION"
}
```

### 4. Authoritative book context

`src/modules/ai/aiService.ts` queries PostgreSQL for the requested book's title, author, subtitle, and description. The application database remains authoritative; Gemini is never allowed to invent or persist club data.

If the book UUID does not exist, the API returns HTTP `404`. The member's private profile, email, discussion comments, and other private data are not sent to Gemini.

### 5. Provider selection and Gemini request

`getAIProvider()` returns a `GeminiProvider` only when `GEMINI_API_KEY` is configured. The provider uses:

```env
GEMINI_API_KEY=your-server-side-key
GEMINI_MODEL=gemini-2.0-flash
```

The key is read only by server code and is never exposed through Vite or browser JavaScript. The provider sends a request to Gemini's `generateContent` endpoint with:

- a system instruction describing the Wine & Chapters discussion companion;
- the authoritative book context from PostgreSQL;
- the member's message;
- `maxOutputTokens: 600`;
- a 20-second request timeout.

If `GEMINI_API_KEY` is absent, the API returns HTTP `503` with code `AI_NOT_CONFIGURED`. This is expected in local development unless Gemini has been configured.

### 6. Response and errors

A successful response is:

```json
{
  "reply": "The generated discussion response...",
  "model": "gemini-2.0-flash"
}
```

The provider maps Gemini failures to application errors. Gemini HTTP `429` becomes HTTP `429`; an empty Gemini response becomes HTTP `502`; other provider failures are returned through the standard API error handler.

### 7. Database behaviour

The chat endpoint currently performs a read-only PostgreSQL query against `books`. It does not create a chat table, save messages, or write AI replies to the database. Conversation history in the demo widget exists only in React component state and disappears when the page is refreshed.

If persistent conversations are added later, they should use a new PostgreSQL migration with explicit retention, member ownership, and deletion rules. Messages must not be sent to Gemini unless the member has authorized that use.

### 8. Connecting the demo widget later

`src/components/site/demo-chat-widget.tsx` currently calls a local `mockReply()` function. A production replacement should:

1. Load the current book UUID from the member hub data.
2. Replace `mockReply()` with a `POST /api/ai/discuss` call.
3. Show a submitting state while the request is in flight.
4. Render API validation, authentication, rate-limit, missing-key, timeout, and provider errors clearly.
5. Keep the visible development notice until the live integration has been tested and approved.

The current demo intentionally does none of this network work; it is a visual and interaction test only.

## Related AI endpoints

All of the following are authenticated and rate-limited in the same way:

| Endpoint                            | Purpose                                      |
| ----------------------------------- | -------------------------------------------- |
| `POST /api/ai/discuss`              | Chat about one book                          |
| `POST /api/ai/book-summary`         | Generate a short book summary                |
| `POST /api/ai/discussion-questions` | Generate discussion questions                |
| `POST /api/ai/review-assist`        | Improve a draft review without publishing it |
| `POST /api/ai/event-theme`          | Suggest an event theme and pairing           |
| `POST /api/ai/book-comparison`      | Compare two to five books                    |
