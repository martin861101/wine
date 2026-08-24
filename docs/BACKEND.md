Agent Task: Build Wine & Chapters Interactive Widget System with Gemini

Objective

Implement a production-ready interactive widget system for the Wine & Chapters website.

The widget must provide members with access to:

- 📖 Current Book
- ⭐ Book Rating
- 📝 Book Reviews
- 🗳️ Book Voting / Ballot
- 📅 Upcoming Events
- 🙋‍♀️ Event RSVP / Who's Attending
- 💰 Event Contributions
- 💡 Suggestion Box
- 🏆 Book Club Leaderboard
- 📊 Monthly Poll
- 📚 Reading History
- 👤 Member Profiles
- 🎁 Giveaways / Challenges
- 📸 Event Gallery
- 🔔 Announcements
- 💳 Payments

The implementation must use:

- React 19+
- TypeScript
- Node.js
- Express
- PostgreSQL
- Gemini API
- REST API
- Object storage for uploaded images
- Existing project authentication if available

Do NOT replace working functionality.

Before implementing anything, inspect the existing project and determine:

1. Existing frontend architecture
2. Existing backend/API architecture
3. Existing authentication
4. Existing PostgreSQL schema
5. Existing environment/configuration system
6. Existing book API integration
7. Existing Gemini/AI integration
8. Existing payment integration
9. Existing file/object storage
10. Existing UI component/design system

Reuse existing implementations wherever possible.

---

1. Architecture

Build this as a modular monolith.

Do NOT create separate microservices for each widget.

Recommended backend:

src/
├── modules/
│   ├── auth/
│   ├── users/
│   ├── books/
│   ├── reviews/
│   ├── events/
│   ├── polls/
│   ├── suggestions/
│   ├── leaderboard/
│   ├── giveaways/
│   ├── gallery/
│   ├── announcements/
│   └── payments/
├── integrations/
│   ├── books/
│   ├── gemini/
│   ├── payments/
│   └── storage/
├── middleware/
├── db/
├── config/
└── server.ts

Use one PostgreSQL database.

Gemini must NEVER be treated as the source of truth for books, votes, ratings, payments, attendance or member information.

PostgreSQL remains authoritative.

---

2. Frontend Widget

Create a reusable component:

components/wine-and-chapters/WineChaptersWidget.tsx

The widget should act as a compact member hub rather than displaying 16 huge sections simultaneously.

Default state:

┌──────────────────────────────────────────┐
│ Wine & Chapters                     ◉    │
├──────────────────────────────────────────┤
│                                          │
│ CURRENT READ                             │
│                                          │
│ [Cover]   The Nightingale                │
│           Kristin Hannah                 │
│           ★ 4.7                          │
│                                          │
│           12 Aug — 8 Sep                 │
│                                          │
│ [View Book] [Rate]                       │
│                                          │
├──────────────────────────────────────────┤
│ Next Event                               │
│ 🍷 Wine, Chapters & Conversation         │
│ 29 August • 18:30                        │
│ 18 attending                             │
│                                          │
│ [I'm Attending]                          │
├──────────────────────────────────────────┤
│ 📖 Books    🗳 Vote    📅 Events          │
│ 💬 Reviews  🏆 Club    ••• More          │
└──────────────────────────────────────────┘

Clicking an action should open the appropriate widget view, drawer or modal.

Do not navigate away from the page unnecessarily.

The UI must be responsive and work well on:

- desktop
- tablet
- mobile

Follow the existing Wine & Chapters design system.

Do not introduce a completely unrelated visual style.

---

3. Current Book

Create:

GET /api/club-books/current

Return:

{
"id": "...",
"title": "...",
"author": "...",
"coverUrl": "...",
"description": "...",
"startDate": "...",
"endDate": "...",
"averageRating": 4.7,
"ratingCount": 18
}

Display:

- cover
- title
- author
- synopsis
- reading dates
- average rating
- member's rating

---

4. Book Search

Use the existing book API if one exists.

Otherwise create a provider abstraction:

BookProvider

Methods:

searchBooks(query)
getBook(id)

Use the existing Open Library provider abstraction for structured book metadata.

External book metadata should be imported into PostgreSQL when a club book is selected.

Do NOT repeatedly depend on the external provider to render previously selected books.

Store:

books

- id
- external_provider
- external_id
- isbn
- title
- author
- description
- cover_url
- publisher
- published_date
- metadata JSONB
- created_at

---

5. Ratings

Create:

POST /api/books/:bookId/rating
PUT /api/books/:bookId/rating
DELETE /api/books/:bookId/rating

Body:

{
"rating": 5
}

Rating must be integer 1–5.

Database:

ratings

- id
- book_id
- user_id
- rating
- created_at
- updated_at

Add:

UNIQUE(book_id, user_id)

Calculate aggregate ratings server-side.

---

6. Reviews

Create:

GET /api/books/:bookId/reviews
POST /api/books/:bookId/reviews
PUT /api/reviews/:id
DELETE /api/reviews/:id

Review:

{
"title": "Loved this book",
"body": "...",
"containsSpoilers": true
}

Database:

reviews

- id
- book_id
- user_id
- title
- body
- contains_spoilers
- status
- created_at
- updated_at

Statuses:

PENDING
PUBLISHED
HIDDEN

Spoiler reviews must initially render hidden behind:

"This review contains spoilers"

with:

[Show Review]

---

7. Voting + Monthly Polls

Build ONE reusable polling engine.

Database:

polls

- id
- type
- title
- description
- starts_at
- ends_at
- status
- created_by
- created_at

poll_options

- id
- poll_id
- label
- book_id nullable
- image_url nullable

poll_votes

- id
- poll_id
- option_id
- user_id
- created_at

Types:

BOOK_BALLOT
MONTHLY_POLL
GENERAL

Prevent duplicate voting using:

UNIQUE(poll_id, user_id)

Endpoints:

GET /api/polls/active
GET /api/polls/:id
POST /api/polls/:id/vote
GET /api/polls/:id/results

Do not expose results before voting if the poll configuration specifies hidden results.

---

8. Events

Database:

events

- id
- title
- description
- event_date
- start_time
- end_time
- venue_name
- venue_address
- theme
- cover_image
- capacity
- contribution_amount
- rsvp_deadline
- payment_deadline
- status
- created_at
- updated_at

Endpoints:

GET /api/events/upcoming
GET /api/events
GET /api/events/:id

Admin:

POST /api/events
PUT /api/events/:id
DELETE /api/events/:id

---

9. RSVP

Database:

event_rsvps

- id
- event_id
- user_id
- status
- guest_count
- created_at
- updated_at

Add:

UNIQUE(event_id, user_id)

Endpoints:

POST /api/events/:id/rsvp
DELETE /api/events/:id/rsvp
GET /api/events/:id/attendees

Respect event capacity.

Use a transaction when capacity enforcement is required to prevent race conditions.

---

10. Suggestions

Members can suggest:

BOOK
VENUE
ACTIVITY
THEME
OTHER

Database:

suggestions

- id
- user_id
- type
- title
- description
- status
- created_at

Statuses:

NEW
REVIEWED
ACCEPTED
DECLINED

Endpoint:

POST /api/suggestions

---

11. Leaderboard

Do not create manually maintained leaderboard scores.

Calculate statistics from authoritative activity data.

Support:

- books participated in
- reviews submitted
- ratings submitted
- events attended
- polls participated in

Endpoint:

GET /api/leaderboard

Return the top members and their statistics.

Avoid designing metrics that encourage spam.

---

12. Reading History

Endpoint:

GET /api/club-books/history

Use existing books and club_books records.

Return previous reads with:

- book
- reading period
- average rating
- rating count
- reviews
- selected date

Do NOT create a duplicate reading_history table unless required by the existing architecture.

---

13. Member Profiles

profiles:

- user_id
- display_name
- avatar_url
- bio
- favourite_book
- favourite_genres JSONB
- profile_visibility
- created_at
- updated_at

Never expose:

- password hashes
- authentication tokens
- payment identifiers
- private email addresses unless explicitly required

Endpoint:

GET /api/members/:id
PUT /api/me/profile

---

14. Giveaways

giveaways

- id
- title
- description
- prize
- image_url
- starts_at
- ends_at
- status
- created_at

giveaway_entries

- id
- giveaway_id
- user_id
- created_at

Add:

UNIQUE(giveaway_id, user_id)

---

15. Event Gallery

Do not store image binaries in PostgreSQL.

Use existing object storage if available.

Create:

event_photos

- id
- event_id
- uploaded_by
- image_url
- thumbnail_url
- caption
- created_at

Validate:

- MIME type
- extension
- size
- authorization

Generate optimized web versions where supported.

---

16. Announcements

announcements

- id
- title
- body
- type
- priority
- starts_at
- expires_at
- created_by
- created_at

Types:

GENERAL
EVENT
BOOK
PAYMENT
URGENT

Endpoint:

GET /api/announcements/active

---

17. Payments

Create a payment provider abstraction.

PaymentProvider:

createCheckout()
verifyPayment()
handleWebhook()
refundPayment()

Do not process or store raw card information.

Database:

payments

- id
- user_id
- event_id nullable
- provider
- provider_reference
- type
- amount
- currency
- status
- metadata JSONB
- created_at
- paid_at

Types:

EVENT
CONTRIBUTION
MERCHANDISE
MEMBERSHIP
DONATION

Statuses:

PENDING
PAID
FAILED
CANCELLED
REFUNDED

Payment webhooks must be:

- signature verified
- idempotent
- logged
- processed server-side

Never mark a payment successful based purely on a frontend redirect.

---

18. Gemini Provider

Create:

integrations/gemini/GeminiProvider.ts

Gemini API credentials must exist ONLY on the backend.

Environment:

GEMINI_API_KEY=
GEMINI_MODEL=

Never expose GEMINI_API_KEY through Vite, React or client JavaScript.

Create a generic interface:

interface AIProvider {
generate(request: AIRequest): Promise<AIResponse>;
}

Implement:

GeminiProvider implements AIProvider

This allows another AI provider to be introduced later without rewriting application logic.

---

19. Gemini Features

Gemini should enhance the club experience rather than control application state.

Implement optional endpoints:

POST /api/ai/book-summary
POST /api/ai/discussion-questions
POST /api/ai/review-assist
POST /api/ai/event-theme
POST /api/ai/book-comparison

Example:

POST /api/ai/discussion-questions

{
"bookId": "..."
}

Backend:

1. Authenticate user.
2. Retrieve book from PostgreSQL.
3. Build controlled Gemini prompt.
4. Call Gemini.
5. Validate output.
6. Return result.

Never allow Gemini to query arbitrary database information.

---

20. AI Discussion Companion

Add an optional action to Current Book:

✨ Discuss with Gemini

Opening it should display something like:

Wine & Chapters AI

"What would you like to explore about The Nightingale?"

Suggested actions:

- Give me discussion questions
- Explain the main themes
- Character discussion
- Historical context
- Help me prepare for book club
- Generate spoiler-free discussion points

Pass controlled book context from the backend.

Do not send private member data to Gemini unnecessarily.

---

21. Gemini Review Assistant

When writing a review provide:

✨ Help me write this

Gemini may:

- improve grammar
- structure thoughts
- shorten a review
- make it more expressive

It must NOT automatically publish.

The member must review and explicitly submit the final content.

---

22. Security

Implement:

- authentication middleware
- authorization/RBAC
- ADMIN and MEMBER roles
- input validation
- parameterized SQL/ORM
- rate limiting
- secure headers
- CORS allowlist
- request size limits
- upload validation
- server-side Gemini credentials
- payment webhook verification
- secure session/token handling
- audit logging for important admin/payment actions

Do not trust IDs, prices, totals, roles or user information sent by the frontend.

Resolve authoritative values server-side.

---

23. Database Migrations

Do not manually alter production tables.

Use the project's existing migration system.

Create migrations for all new tables, indexes, foreign keys and constraints.

Add indexes for commonly queried columns such as:

book_id
user_id
event_id
poll_id
status
created_at
event_date

Do not destroy existing data.

---

24. Admin Controls

Provide admin management for:

- current book
- reading dates
- events
- polls
- book ballots
- announcements
- reviews/moderation
- giveaways
- gallery
- suggestions
- payment status/history

Reuse the existing admin area if available.

---

25. Widget API

Create an aggregated endpoint:

GET /api/widget/home

This prevents the frontend from making excessive requests just to render the initial widget.

Example response:

{
"currentBook": {},
"upcomingEvent": {},
"activeBallot": {},
"announcement": {},
"member": {
"rating": 5,
"rsvpStatus": "ATTENDING"
},
"stats": {
"members": 24,
"booksRead": 18
}
}

Only return information needed by the widget.

---

26. Loading/Error States

Every widget component must implement:

- loading state
- empty state
- error state
- success feedback
- disabled/submitting state

Do not leave blank UI when API requests fail.

Use optimistic updates only where safe.

Payments must never use optimistic success.

---

27. Implementation Priority

Implement in phases.

Phase 1

- Authentication integration
- Books
- Current Book
- Ratings
- Reviews
- Reading History
- Events
- RSVP
- Announcements
- Widget home API

Phase 2

- Book ballots
- Monthly polls
- Suggestions
- Leaderboard
- Profiles
- Giveaways
- Gallery

Phase 3

- Payments
- Contributions
- Payment webhooks

Phase 4

- Gemini provider
- AI discussion companion
- discussion question generation
- review assistant
- book comparison
- event/theme assistance

---

28. Tests

Add tests for critical functionality.

At minimum:

- authentication
- duplicate ratings
- duplicate votes
- RSVP capacity
- permissions
- review ownership
- poll closing dates
- payment webhook idempotency
- invalid payment signatures
- Gemini API failure
- Gemini rate limiting
- malformed AI responses

---

29. Documentation

Create:

docs/WINE_CHAPTERS_WIDGET.md

Document:

- architecture
- database schema
- API endpoints
- environment variables
- Gemini setup
- book provider setup
- storage setup
- payment provider setup
- authentication
- admin permissions
- deployment
- migrations
- testing

Update ".env.example".

Never place real API keys in documentation or source control.

---

30. Completion Requirements

The task is complete when a logged-in member can:

1. Open the Wine & Chapters widget.
2. See the current book.
3. View book details.
4. Rate the book.
5. Submit/edit a review.
6. Mark reviews as containing spoilers.
7. See the next event.
8. RSVP.
9. See attendees where permitted.
10. Vote for the next book.
11. Participate in monthly polls.
12. Submit suggestions.
13. View reading history.
14. View leaderboard statistics.
15. Manage their profile.
16. View giveaways.
17. View event galleries.
18. Read announcements.
19. Make supported payments/contributions.
20. Use Gemini-powered book-club assistance.

Admins must be able to manage the corresponding club content.

Do not mock functionality in the final implementation.

If an external integration cannot be completed because credentials are unavailable, implement the complete provider/interface, configuration and error handling, document the required environment variables, and clearly mark only that external connection as pending.

Most importantly:

- preserve existing functionality
- inspect before modifying
- reuse existing architecture
- keep PostgreSQL authoritative
- keep Gemini server-side
- keep payment processing server-side
- avoid unnecessary microservices
- produce clean, maintainable, typed production code
