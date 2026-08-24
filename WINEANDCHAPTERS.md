# Wine & Chapters Community

## Website review updates

The August 2026 website review has been implemented across the public UI. Membership is presented
as free, the founder story and supplied member testimonial replace the placeholder history and
quotes, the new logo is used throughout the site, contact details match the review document, and
the light/dark theme switch has been removed.

The public `/reviews` route contains a responsive book-review form based on the supplied paper
review sheet. It captures star rating, title, author, genre, picker, reading dates, format, spice and
tear levels, mood, thoughts, favourite quotes, recommendation and spoiler status. Signed-in members
can submit reviews for books already in the club catalogue; submissions enter moderation as
`PENDING`.

The Events page now includes optional, non-recurring Paystack contributions with preset or custom
amounts. Deploy `backend/supabase/migrations/20260818203000_contribution_orders.sql` and the updated
`paystack-checkout` and `paystack-webhook` Edge Functions before enabling this in production. See
`docs/WEBSITE_REVIEW_UPDATES.md` for the full implementation and deployment notes.

## About reader and legal pages

The full `/about` reader now presents a two-sided book on desktop: the active story page on the
left and the book cover on the right using `ui/public/img/wine-chapters-logo-2.jpeg`. The selected
numbered clip sits in a separate adjacent paper panel, so it is not treated as a third book page.
“It started with one person.” is the first story page. The page-turn animation is deliberately
slowed to 1.7 seconds, and the layout stacks cleanly on small screens.

The reading-room launcher is slightly larger, and the footer now links to the internal Privacy
Policy, Terms of Use and Cookie Notice pages. Wine & Chapters is a non-profit community, so no
refund-policy page or link is included. The navbar uses the transparent second-logo cutout at
`ui/public/img/wine-chapters-logo-2-transparent.png` so the enlarged mark has no rectangular image
background.

## Production UI build

The Xneelo frontend is built from `ui/`. Before running `npm run build`, create the
Git-ignored `ui/.env.production` file with only
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and
`VITE_ENABLE_DEMO_FALLBACK=false`. Upload the contents of `ui/dist/`, including
`.htaccess`, to Xneelo. Never upload either environment file or include server
secrets in a `VITE_*` variable.

## Reference-inspired visual theme

The public UI uses the supplied Wine & Chapters reference as its visual direction: warm ivory
paper, blush-pink surfaces, coral actions, soft olive botanical accents, and charcoal editorial
type. The homepage hero keeps the existing wine-and-books photography with a restrained left paper
wash, a more balanced crop, and a softened glass meetup card so the copy stays legible without
flattening the photograph. Its animated botanical shadow is height-constrained and softly masked,
keeping the source bitmap sharp while its hard edge remains outside the visible hero at every point
in the drift animation.

The About block directly below the hero is an interactive two-sided book with the story page on the
left and the second supplied logo on the cover at right. Its selected renamed clip sits beside the
book in a separate paper-framed panel with a translucent wrinkled-paper texture. The section keeps
lined paper pages, botanical decorations, a community CTA, and previous/next page controls. The
fixed reading-room AI launcher has three tiny, decorative butterflies that drift around it and
respect the site-wide reduced-motion preference. The same
blush/cream treatment is also applied to the full About page reader. Theme tokens and responsive
book layouts live in `ui/src/styles.css`; the homepage composition and page content live in
`ui/src/routes/index.tsx`.

## Ambient video library

The supplied clips in `videos/` are mirrored into `ui/public/videos/` so Vite includes them in the
static frontend build. `ui/src/data/videos.ts` keeps the numbered assignments together: every page
in the full `/about` storybook and homepage About interaction has a distinct clip. Those About clips
are rendered in a separate paper-framed panel with a translucent wrinkled-paper treatment and
accessible descriptive labels. The reusable
`AmbientVideo` component keeps each clip autoplaying, looping, muted and inline with metadata
preloading, while poster images provide a quiet fallback during loading. See
`docs/VIDEO_INTEGRATION.md` for the placement map and maintenance notes.

UI verification: `npm --prefix ui run typecheck`, `npm --prefix ui run lint`, and
`npm --prefix ui run build`.

AI Software Engineer Prompt

You are a Senior Staff Full Stack Engineer, UX Designer, Database Architect, and Product Designer.

Your task is to build a complete production-ready web application called Wine & Chapters, a premium online community for a women's book club. The requirements come from the attached specification.

Do NOT build a prototype.

Build a scalable production application with clean architecture, reusable components, secure authentication, excellent UX, accessibility, responsive design, and maintainable code.

---

Tech Stack

Use the following stack.

Frontend

React 19

TypeScript

Vite

Tailwind CSS

shadcn/ui

Framer Motion

React Router

React Hook Form

Zod

TanStack Query

Lucide Icons

Backend

Node.js

NestJS

TypeScript

Prisma ORM

PostgreSQL

JWT Authentication

Refresh Tokens

bcrypt password hashing

REST API

Swagger API documentation

Storage

PostgreSQL

S3 compatible storage (Supabase Storage or Cloudflare R2)

Authentication

Email/password

Forgot Password

Email Verification

Admin roles

Member roles

Protected routes

Refresh Tokens

Deployment

Docker

Docker Compose

GitHub Actions

Vercel (Frontend)

Railway or Render (Backend)

---

Folder Structure

wine-chapters/

apps/

    web/

    api/

packages/

    ui/

    types/

    utils/

prisma/

docker/

.github/

Use a monorepo.

---

Design Style

The design should feel

Elegant

Warm

Premium

Soft luxury

Community driven

Feminine

Inspired by

cozy libraries

bookstores

wine lounges

coffee shops

flowers

reading corners

Primary palette

Blush Pink

Cream

Warm Beige

Sage Green

Soft Brown

Typography

Playfair Display

Inter

Rounded cards

Large spacing

Glass effects where appropriate

Subtle gradients

Beautiful micro animations

No generic dashboard look.

Everything should feel premium.

---

Public Website

Create pages

Home

About

Membership

Events

Contact

Login

Register

Homepage sections

Hero

About Wine & Chapters

Benefits of joining

Current Book

Upcoming Event

Testimonials

Statistics

120+ Members

Call to Action

Instagram Feed

Newsletter

Footer

---

Authentication

Implement

Register

Login

Forgot password

Reset password

Verify email

Remember me

Logout

Refresh token

Role based access

Admin

Member

---

Member Portal

After login users see

Dashboard

Dashboard contains

Current Book

Next Meetup Countdown

Announcements

Reading Progress

Recent Reviews

Upcoming Events

Community Activity

Notifications

Quick Actions

---

User Profile

Each member has

Profile photo

Bio

Location

Instagram handle

Favorite genres

Favorite books

Current read

Wishlist

Reading goal

Books read

Achievements

Badges

Reading streak

Privacy settings

---

Book Reviews

This is the core feature.

Members can create reviews.

Review includes

Book Cover

Book Title

Author

Rating

Date Finished

Favorite Quote

Favorite Character

Favorite Scene

Recommend Yes/No

Full Review

Reading Format

Genres

Reading Time

Tags

Contains Spoilers checkbox

If spoilers are enabled

Hide review

Show

⚠ Spoiler Warning

Reveal Review button

Members can

Like

Comment

Bookmark

Share

Report

Edit own review

Delete own review

---

Review Feed

Filters

Book

Author

Genre

Rating

Newest

Popular

Book Club Picks

Spoiler Free

Spoilers

Search

Infinite scrolling

Pagination

Sorting

---

Events

Event model

Banner

Date

Time

Venue

Maps Link

Capacity

Price

Theme

Host

Description

Dress Code

Attendees

Remaining Spaces

Members can RSVP

Attending

Maybe

Can't Attend

Waitlist

Calendar View

List View

---

Announcements

Admins create announcements.

Fields

Title

Description

Priority

Expiry Date

Image

Pinned

Announcements expire automatically.

---

Monthly Voting

Admins create nominees.

Each nominee contains

Book Cover

Synopsis

Genre

Pages

Goodreads Rating

Voting closes automatically

One vote per member

Live vote count

---

Reading Challenge

Books Read

Progress

Monthly Goal

Yearly Goal

Badges

Achievements

Leaderboard

Milestones

---

Member Directory

Search

Filter

Public/Private Profiles

View member profile

---

Notifications

Real time notifications

Likes

Comments

Announcements

Voting

Events

Books

Mention notifications

Mark as read

---

Admin Dashboard

Admins can

Approve members

Manage books

Manage reviews

Manage comments

Manage events

Manage announcements

Manage votes

Manage users

Analytics

Attendance

Exports

Platform statistics

---

Contribution Page

Members can contribute toward monthly meetups.

Features

Contribution amount

Optional message

Payment integration abstraction

Contribution history

Admin reporting

---

Contact Section

Inside member onboarding show

Instagram page

Contact information

WhatsApp community instructions

Location

Member name

Region

These details are collected during onboarding.

---

Database Design

Create Prisma models for

User

Role

Profile

Book

Author

Review

Comment

Like

Bookmark

Genre

Event

RSVP

Announcement

Vote

BookNominee

Notification

Badge

Achievement

ReadingChallenge

Contribution

Media

AuditLog

RefreshToken

Include

Indexes

Relationships

Constraints

Cascade deletes

Optimized queries

---

API

Generate complete REST endpoints.

Example

POST /auth/login

POST /auth/register

GET /books

POST /reviews

PATCH /reviews/:id

DELETE /reviews/:id

POST /events/:id/rsvp

POST /vote

GET /notifications

GET /dashboard

Use validation.

DTOs.

Swagger.

---

Security

CSRF protection

Rate limiting

Helmet

Input validation

SQL Injection prevention

XSS protection

Sanitized HTML

Authorization Guards

Audit Logging

Secure Cookies

Refresh Token Rotation

---

Frontend Requirements

Reusable components.

Dark mode.

Light mode.

Loading skeletons.

Empty states.

Optimistic updates.

Error boundaries.

Toast notifications.

Responsive navigation.

Accessible forms.

Keyboard navigation.

WCAG AA accessibility.

---

Performance

Lazy loading

Image optimization

Memoization

Virtualized review lists

Server pagination

React Query caching

Code splitting

---

Testing

Backend

Unit Tests

Integration Tests

Frontend

Vitest

React Testing Library

E2E

Playwright

---

DevOps

Docker

Docker Compose

Environment variables

GitHub Actions

Linting

Formatting

Pre-commit hooks

ESLint

Prettier

Husky

---

Deliverables

Generate:

1. Complete project structure.

2. Prisma schema.

3. Backend.

4. Frontend.

5. Shared UI package.

6. API documentation.

7. Docker configuration.

8. Environment variable templates.

9. README with setup instructions.

10. Seed script with sample books, events, reviews, announcements, badges, and users.

11. Production-ready code with no placeholders.

12. Clean architecture following SOLID principles.

13. Modern UI matching the Wine & Chapters premium aesthetic.

Do not skip any features. Build every page, API endpoint, database model, and user flow described in the specification, ensuring the application is fully functional, secure, responsive, and ready for deployment.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/1c26db73-80c6-4e5a-9daa-0725aa48e239).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Current architecture

Production has two deployment surfaces:

- `ui/` — static React/TanStack Router SPA hosted by xneelo at `https://wineandchapters.co.za`.
- `backend/supabase/` — Supabase Auth, Postgres/PostgREST API, row-level security, Storage, database RPCs, and Edge Functions.

The UI connects directly to `https://ykyzelgoeblxhcdguyww.supabase.co` with the public Supabase publishable key. Authorization is enforced in Postgres with RLS; the service-role key is never included in the UI. The older Node code under `backend/src/` is retained as a migration reference and is not part of the production runtime.

The reading-room AI calls the authenticated `ai-chat` Supabase Edge Function. Gemini credentials remain in Supabase secrets and are never compiled into the xneelo UI.

Administrator event creation, event-image uploads, live member events, book imports, and monthly-read selection use Supabase PostgREST, RPCs, and the public `event-photos` Storage bucket. Paid membership buttons initialize Paystack through server-side Edge Functions.

Paystack checkout is server-initialized, so no public Paystack key is compiled into the UI.
Store only `PAYSTACK_SECRET_KEY` in Supabase Edge Function secrets and configure Paystack to
send webhooks to `https://ykyzelgoeblxhcdguyww.supabase.co/functions/v1/paystack-webhook`.

The production administrator account is `hello@wineandchapters.co.za`. Its password is managed only through Supabase Auth and is never stored in this repository.

## Development

Install dependencies and create the UI environment file:

```sh
npm install
cp ui/.env.example ui/.env
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, then run the UI:

```sh
npm run dev:ui
```

Open [http://127.0.0.1:5178](http://127.0.0.1:5178). There is no local Node API proxy; browser requests go to Supabase.

Database and Edge Function deployments are run from `backend/` so the CLI uses `backend/supabase/config.toml`:

```sh
npm run deploy:supabase
```

The deployment script runs backend checks, confirms the linked project, shows migration
history, asks for production confirmation, applies pending migrations, pushes Auth/project
configuration, deploys all Edge Functions, and verifies the result. For CI, authenticate
with `SUPABASE_ACCESS_TOKEN` and use:

```sh
npm run deploy:supabase -- --yes
```

Individual CLI commands remain available when only one deployment surface is needed:

```sh
cd backend
npx supabase db push
npx supabase config push
npx supabase functions deploy contact --no-verify-jwt
npx supabase functions deploy broadcast
npx supabase functions deploy ai-chat
npx supabase functions deploy paystack-checkout
npx supabase functions deploy paystack-webhook
npx supabase functions deploy open-library-search --no-verify-jwt
```

`open-library-search` requires an authenticated member and uses Open Library without
an API key. `ai-chat` keeps `TAVILY_API_KEY` server-side for current web research.
SMTP-delivered messages use the shared Wine & Chapters email
layout; Supabase Auth confirmation, recovery, and invitation templates live in
`backend/supabase/templates/` and are applied with `supabase config push`.

## Dynamic club content

Homepage reads and events, the public event calendar, published reviews, review
comments, suggestions, voting, and member activity now use Supabase as their single
source of truth. Administrators manage the current read, complete event details and
images, publication status, reviews/comments, suggestions, polls, members, and club
communications from `/admin`. The member clubhouse at `/portal` includes the current
read, Open Library discovery, persistent suggestions, voting, activity, events, and
discussions. See [docs/UI_FIXES_IMPLEMENTATION.md](docs/UI_FIXES_IMPLEMENTATION.md).

## xneelo deployment

The xneelo server does not need Node.js. Build the UI on a development machine with `ui/.env` present, then upload the **contents** of `ui/dist/` to the domain's `public_html` directory. Include the hidden `ui/dist/.htaccess` file so all client-side routes fall back to `index.html`.

```sh
npm install
npm --prefix ui run build
```

Only the public Supabase URL and publishable key belong in `ui/.env`; Vite embeds them during the build, so the environment file must not be uploaded. Do not add a database password, JWT signing secret, Supabase secret/service-role key, SMTP password, Gemini key, or Paystack secret to any `VITE_*` variable.

Supabase Auth is configured with `https://wineandchapters.co.za` as its site URL and trusts the `/verify-email` and `/reset-password` callbacks. Edge Function CORS is restricted to the same origin.

## Verification

```sh
npm run typecheck
npm test
npm run build:all
npm run lint
```

Supabase provisioning, RLS, secrets, migration, and xneelo deployment details are in [docs/SUPABASE_BACKEND.md](docs/SUPABASE_BACKEND.md). [docs/BACKEND_FUNCTIONS.md](docs/BACKEND_FUNCTIONS.md) documents the legacy Node implementation retained as a reference.

The legacy Firebase Functions package remains available independently. Its fixed predeploy checks are:

```sh
npm --prefix functions run lint
npm --prefix functions run build
```
