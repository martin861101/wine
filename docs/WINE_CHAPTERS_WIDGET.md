# Wine & Chapters Member Hub

> Repository layout note: UI code is under `ui/src` and API/service code is under `backend/src`. Supabase deployment details are in [SUPABASE_BACKEND.md](SUPABASE_BACKEND.md).

## Current architecture

The application is a modular monolith built on TanStack Start. Server routes live in `src/routes/api`, domain logic lives in `src/modules`, PostgreSQL is accessed through `pg`, and third-party integrations are isolated under `src/integrations`.

PostgreSQL is authoritative for users, books, club reads, ratings, reviews, polls, RSVPs, payments, and member activity. Gemini only generates optional copy and discussion assistance.

The member-facing hub is `/portal`. Its initial data is loaded from `GET /api/widget/home`, which aggregates the current book, next event, active ballot/poll, announcement, giveaway, member state, and club statistics.

## Demo chat widget

The shared site shell includes a themed floating chat preview, implemented in `src/components/site/demo-chat-widget.tsx`. It is explicitly marked `Mock test · AI integration in development`, uses local sample replies, and does not call Gemini or any AI API. It is intended for visual and interaction testing only.

The live AI discussion endpoint remains `POST /api/ai/discuss` and requires an authenticated member plus `GEMINI_API_KEY`. The demo widget is intentionally separate until the production chat experience is ready.

## Local setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL using the configured `DATABASE_URL`.
3. Run `npm run db:migrate` and `npm run db:seed`.
4. Run `npm run dev` and sign in with a seeded account.

The local email provider prints verification and password-reset links to the server console. Do not use seeded passwords or the console provider in production.

## Authentication

Access and refresh tokens are issued as HttpOnly, SameSite cookies. Bearer tokens remain accepted for API clients. Refresh and email verification are public endpoints; member routes require a verified and approved account, and admin routes additionally require the `ADMIN` role.

Relevant endpoints:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/verify-email?token=...`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## Member API

- `GET /api/widget/home`
- `GET /api/club-books/current`
- `GET /api/club-books/history`
- `GET /api/books/search?q=...`
- `POST|PUT|DELETE /api/books/:bookId/rating`
- `GET|POST /api/books/:bookId/reviews`
- `PUT|DELETE /api/reviews/:reviewId`
- `GET /api/events/upcoming`
- `GET /api/events/:eventId`
- `POST|DELETE /api/events/:eventId/rsvp`
- `GET /api/events/:eventId/attendees`
- `GET /api/polls/active`
- `POST /api/polls/:pollId/vote`
- `GET /api/leaderboard`
- `GET|PUT /api/me/profile`
- `POST /api/suggestions`
- `GET /api/giveaways`
- `POST /api/giveaways/:giveawayId/enter`
- `GET|POST /api/gallery/events/:eventId`
- `GET /api/announcements/active`

New book metadata is imported through the admin-only `POST /api/admin/books/import` endpoint before an admin assigns the book with `PUT /api/admin/club-books/current`.

## External integrations

Required secrets stay server-side:

- Open Library is the structured metadata and cover provider. Tavily supplies current web discovery only when the AI question needs freshness.
- Gemini is optional and rate-limited. AI output is returned as assistance and never writes authoritative club data.
- Paystack is optional. Amounts in `payments.amount` are integer minor currency units, payment totals are derived server-side for event payments, and webhook signatures are verified before idempotent processing.
- Local storage is suitable only for development. Production startup rejects local storage and requires Firebase Storage configuration. Uploaded gallery files are signature-checked and attendee/admin authorization is enforced.
- Resend is the production email provider.

## Operational notes

Run:

```sh
npm run build
npx tsc --noEmit
npm run lint
```

The migration runner records applied SQL files in `_migrations`; never manually alter production tables. Before deployment, configure HTTPS, database backups, Firebase Storage rules/retention, Paystack webhooks, Resend, rate-limit storage appropriate to the deployment topology, and CI coverage for authentication, duplicate votes/ratings, RSVP capacity, payment webhooks, uploads, and AI failures.
