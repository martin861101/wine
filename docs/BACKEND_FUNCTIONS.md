# Backend Functions Reference

> Repository layout note: backend paths in this document are rooted at `backend/`. For example, `src/routes/api` means `backend/src/routes/api`. The backend now supports Supabase Postgres and Supabase Storage; see [SUPABASE_BACKEND.md](SUPABASE_BACKEND.md) for setup.

This document explains how the Wine & Chapters backend is structured, what each backend function does, and how an HTTP request moves through the system.

## Backend stack

- TanStack Start server routes in `src/routes/api`.
- PostgreSQL accessed through `pg` and `DATABASE_URL`.
- SQL migrations in `src/db/migrations`.
- TypeScript service modules in `src/modules`.
- Zod request validation.
- HttpOnly access and refresh cookies.
- Provider adapters for email, AI, books, payments, and file storage.

PostgreSQL is the required database. There is no SQLite or in-memory application database. The only in-memory state is the development rate-limit bucket map.

## Request lifecycle

```text
HTTP request
  -> TanStack Start route in src/routes/api
  -> global request middleware in src/start.ts
  -> route middleware: auth, admin, or rate limit
  -> Zod parseBody validation
  -> domain service in src/modules
  -> PostgreSQL transaction/query or external provider
  -> Response.json()
  -> handleApiError() for failures
```

### Global server functions

`src/start.ts` exports `startInstance`, which installs:

- `errorMiddleware`: catches unexpected server errors and renders the application error page.
- CSRF middleware: protects TanStack server functions.
- `apiSecurityMiddleware`: applies `nosniff`, clickjacking, referrer-policy, CORS, and OPTIONS handling to `/api/*` requests.

`src/server.ts` is the runtime entrypoint. It loads the TanStack server entry, normalizes swallowed h3 SSR errors, and returns the branded 500 page for catastrophic failures.

`src/lib/validation.ts` provides:

- `parseBody(request, schema)`: rejects bodies over 1 MB, parses JSON, and validates it with Zod.
- `handleApiError(error)`: converts validation, application, provider, and unknown errors to the standard JSON error response.
- `stripUndefined(input)`: removes optional `undefined` fields before passing data to service types.

The normal error shape is:

```json
{
  "message": "Human-readable error",
  "code": "VALIDATION"
}
```

## Database functions

`src/config/env.ts` exports `loadEnv()` and the validated `env` object. In development, the default connection is:

```text
postgres://wine:wine_local_dev@127.0.0.1:5432/wine_chapters
```

`src/db/pool.ts` exports:

- `pool`: PostgreSQL connection pool, maximum 10 connections.
- `withTransaction(callback)`: begins a transaction, commits on success, rolls back on failure, and releases the client.
- `ping()`: checks database availability.
- `closePool()`: closes all pool connections.

`src/db/db.ts` exports `db`, the shared `pg.Pool` client, and re-exports `withTransaction`.

`src/db/migrate.ts` exports `runMigrations()`. It creates `_migrations`, reads SQL files in sorted order, runs each pending migration in a transaction, and records its filename. Run it with:

```sh
npm run db:migrate
```

Current schema groups:

- `001_initial_schema.sql`: users, profiles, auth tokens, books, club books, ratings, reviews, and core community tables.
- `002_events_rsvps_polls.sql`: events, RSVP records, polls, options, and votes.
- `003_suggestions_giveaways_gallery_announcements_payments.sql`: suggestions, giveaways, gallery photos, announcements, payments, and audit logs.
- `004_discussions.sql`: `discussion_threads` and `discussion_comments`.
- `005_admin_dashboard.sql`: `newsletter_subscribers` and `club_books.progress_percent`.

All database calls use parameterized PostgreSQL queries. State-changing operations that need multiple writes use `withTransaction()`.

## Authentication and authorization

`src/modules/auth/authService.ts` exports:

- `register(input)`: normalizes email, hashes the password, creates a user and profile, stores a hashed email-verification token, and sends the verification message.
- `login(email, password, ip)`: verifies credentials, email verification, and admin approval, then creates access and refresh tokens.
- `refresh(rawRefreshToken, ip)`: validates and rotates a stored refresh token and issues a new session.
- `logout(rawRefreshToken, userId)`: revokes the refresh token and writes an audit entry.
- `requestPasswordReset(email)`: creates a one-hour hashed reset token and sends a reset message without revealing whether an account exists.
- `resetPassword(token, password)`: validates the reset token, updates the password, marks the token used, and revokes existing refresh tokens.
- `verifyEmail(token)`: validates the 48-hour token, marks the user verified, and marks the token used.
- `me(userId)`: returns the public user representation.

`src/lib/password.ts` provides `hashPassword()` and `verifyPassword()`, using Node `scrypt` with a random salt.

`src/lib/tokens.ts` provides access-token signing/verification, refresh-token signing/verification, opaque token generation, verification-token generation, and token hashing. Refresh tokens are stored only as hashes in PostgreSQL. Access and refresh values are shaped as signed tokens and are never stored in browser local storage.

`src/lib/authCookies.ts` provides:

- `setAuthCookies(response, session)`: sets `wc_access_token` and `wc_refresh_token` as HttpOnly cookies.
- `clearAuthCookies(response)`: expires both cookies.
- `readCookie(request, name)`: reads a named cookie.

`src/middleware/auth.ts` provides:

- `loadUserFromRequest(request)`: reads a Bearer token or access cookie, verifies it, reloads the user from PostgreSQL, and requires both `email_verified` and `approved`.
- `requireAuth`: rejects unauthenticated requests with HTTP 401 and adds `context.auth` to valid requests.
- `requireAdmin`: runs `requireAuth`, then requires `context.auth.user.role === "ADMIN"`; otherwise it returns HTTP 403.

`src/middleware/rateLimit.ts` provides `createRateLimit()`, `authRateLimit` (30 requests per IP per 15 minutes), and `aiRateLimit` (20 requests per IP per minute). These buckets are process-local and should move to shared storage such as Redis for a multi-instance production deployment.

## Domain service functions

Route handlers are intentionally thin. They validate input, call one of these service functions, and serialize the result.

### Members and profiles

- `profilesService.getByUserId(userId)`, `getById(id)`, and `update(userId, input)` read and update profile data.
- `toPublicUser()` and `mapUserRow()` convert database user rows into safe public objects.
- `members/$memberId` exposes a protected member profile lookup.

### Books and club reads

`booksService` provides `search(query)`, `getById(id)`, `importExternal(result)`, and `getForSelection(result)`. External provider results are upserted into the authoritative `books` table before they are used for club selection.

`clubBooksService` provides `setCurrentByBookId()`, `setCurrent()`, `getCurrent()`, `getWithMyRating(userId)`, `getHistory()`, and `updateProgress(progressPercent)`. Only one `CURRENT` club book is allowed by the database partial unique index.

`ratingsService` provides `upsert()`, `remove()`, `getUserRating()`, `getAggregate()`, and `assertBookExists()`. Ratings are unique per user and book.

`reviewsService` provides `create()`, `getForBook()`, `countPublished()`, `update()`, `remove()`, and `setStatus()`. New reviews start as `PENDING`; admins can publish, hide, or remove them.

### Events, RSVP, polls, and announcements

`eventsService` provides `create()`, `update()`, `remove()`, `getById()`, `list()`, `upcoming()`, and `getWithStats()`.

`rsvpService` provides `getForUser()`, `countForEvent()`, `countStatus()`, `rsvp()`, `remove()`, and `attendees()`.

`pollsService` provides `create()`, `getById()`, `listActive()`, `getOptions()`, `getResults()`, and `vote()`. Vote uniqueness is enforced by the database and service checks.

`announcementsService` provides `listActive()` and `create()`. Expiry is handled by filtering active records at query time.

### Discussions

`discussionsService.list()` returns threads with their comments and author display names. `createThread(authorId, input)` creates a post, and `createComment(authorId, threadId, body)` verifies the thread exists before creating a reply.

The discussion endpoints require an approved, verified member:

```text
GET  /api/discussions
POST /api/discussions
POST /api/discussions/:threadId/comments
```

### Admin functions

`adminService.overview()` gathers members, newsletter subscribers, current book, events, and discussion statistics for the dashboard.

`adminService.updateMember(memberId, input)` changes member approval, role, or account state.

`adminService.subscribe(email)` upserts a newsletter subscriber.

`adminService.broadcast({ audience, subject, body })` resolves `MEMBERS`, `SUBSCRIBERS`, or `ALL`, sends messages through the configured email provider, and returns delivery counts.

Admin routes also call the domain services for event creation/update/delete, current-book selection, reading-progress updates, review moderation, poll creation, book importing, giveaway creation, payment administration, announcement creation, and suggestion status updates. Every `/api/admin/*` route uses `requireAdmin` server middleware; hiding the navigation link is not the security control.

### Widget aggregation

`widgetService.home(userId)` aggregates current-book data, the member's rating, reviews, events, announcements, polls, and club statistics for `GET /api/widget/home`. The query is server-side and requires authentication.

### Other domain services

- `galleryService`: `uploadPhoto()`, `listForEvent()`, and `remove()`; storage is selected through `getStorageProvider()`.
- `giveawaysService`: `listActive()`, `create()`, `enter()`, and `hasEntered()`.
- `leaderboardService.get(limit)`: returns member leaderboard data.
- `suggestionsService`: `create()`, `list()`, and `setStatus()`.
- `paymentsService`: `create()`, `createCheckout()`, `getById()`, `listForUser()`, `listAll()`, `setStatus()`, `markPaidByProviderReference()`, `refund()`, and `processWebhook()`.
- `writeAuditLog(db, entry)`: stores actor, action, entity, metadata, and IP information in `audit_logs`.

## API route inventory

### Authentication

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/auth/verify-email
```

### Member features

```text
GET/PUT    /api/me/profile
GET        /api/members/:memberId
GET/POST   /api/discussions
POST       /api/discussions/:threadId/comments
GET        /api/widget/home
GET        /api/club-books/current
GET        /api/club-books/history
GET/POST   /api/books/:bookId/reviews
PUT/DELETE /api/reviews/:reviewId
POST/PUT/DELETE /api/books/:bookId/rating
GET        /api/books/:bookId
GET        /api/books/search
GET        /api/events
GET        /api/events/upcoming
GET        /api/events/:eventId
GET        /api/events/:eventId/attendees
POST/DELETE /api/events/:eventId/rsvp
GET        /api/polls/active
GET        /api/polls/:pollId
GET        /api/polls/:pollId/results
POST       /api/polls/:pollId/vote
GET        /api/announcements/active
GET        /api/giveaways
POST       /api/giveaways/:giveawayId/enter
GET        /api/leaderboard
POST       /api/suggestions
GET/POST   /api/gallery/events/:eventId
DELETE     /api/gallery/photos/:photoId
GET/POST   /api/payments
POST       /api/payments/checkout
```

### AI routes

```text
POST /api/ai/book-summary
POST /api/ai/book-comparison
POST /api/ai/discuss
POST /api/ai/discussion-questions
POST /api/ai/event-theme
POST /api/ai/review-assist
```

All AI routes require authentication and `aiRateLimit`. The current demo chat does not call these routes; it uses local mock replies. The live route flow is documented in [CHAT_WIDGET.md](CHAT_WIDGET.md).

### Admin routes

```text
GET   /api/admin/overview
PATCH /api/admin/members/:memberId
POST  /api/admin/broadcast
POST  /api/admin/announcements
POST  /api/admin/events
PUT   /api/admin/events/:eventId
DELETE /api/admin/events/:eventId
PUT/PATCH /api/admin/club-books/current
POST  /api/admin/books/import
POST  /api/admin/giveaways
POST  /api/admin/polls
PATCH /api/admin/reviews/:reviewId
GET/PATCH /api/admin/suggestions/:suggestionId
GET/POST /api/admin/payments
```

`POST /api/newsletter` is the public subscription endpoint. It validates the email and stores it in `newsletter_subscribers`; bulk delivery remains admin-only.

## Provider integrations

Provider selection is lazy and based on environment variables:

- Email: `getEmailProvider()` selects console logging for development or `ResendEmailProvider` for `EMAIL_PROVIDER=resend`.
- AI: `getAIProvider()` returns `GeminiProvider` only when `GEMINI_API_KEY` exists; otherwise AI routes return `AI_NOT_CONFIGURED` with HTTP 503.
- Books: `getBookProvider()` uses `GoogleBooksProvider` and imports selected metadata into PostgreSQL.
- Storage: `getStorageProvider()` selects local storage or Firebase Storage.
- Payments: `getPaymentProvider()` returns Paystack only when `PAYSTACK_SECRET_KEY` exists.

External secrets stay in server-side environment variables. They are not exposed through `VITE_*` client variables.

## AI backend flow

`aiService` provides `bookSummary()`, `discussionQuestions()`, `reviewAssist()`, `eventTheme()`, `bookComparison()`, and `discuss()`.

For book-based features, the service first loads title, author, subtitle, and description from PostgreSQL. It then builds a constrained prompt and calls `GeminiProvider.generate()`. The provider sends a 20-second timed request, limits output tokens, handles HTTP 429 separately, and rejects empty responses. The database remains authoritative; Gemini output is returned to the caller and is not automatically stored.

## Email and uploads

`sendEmail()` delegates to the selected email provider. The console provider prints the message and verification/reset URL to server logs. Resend sends `from`, `to`, subject, text, and HTML through the Resend API with a 15-second timeout.

Upload routes pass file data to `galleryService`, which delegates storage to the selected provider. Local storage is intended for development. Production environment validation requires Firebase Storage.

## Operational commands

```sh
npm run db:migrate
npm run db:seed
npm run db:create-admin
npm run typecheck
npm run test
npm run build
npm run pm2:start
npm run pm2:restart
```

Required runtime configuration is documented in `.env.example`. Production requires non-development JWT secrets, HTTPS `PUBLIC_APP_URL`, Resend credentials, Paystack credentials, and Firebase Storage settings.

## Adding a backend function

1. Add or update a PostgreSQL migration in `src/db/migrations`.
2. Add a focused service method in the appropriate `src/modules` directory.
3. Add a route under `src/routes/api`.
4. Add Zod validation with `parseBody()` for request bodies.
5. Add `requireAuth`, `requireAdmin`, and/or rate limiting as appropriate.
6. Convert failures with `handleApiError()`.
7. Add audit logging for privileged or security-sensitive state changes.
8. Add or update tests, run migrations, and run `npm run typecheck` and `npm run build`.
