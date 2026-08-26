# Review Publishing and Admin Member Backend

## Delivered backend

Migration `20260826120000_reviews_members_admin_auth.sql` adds structured review fields,
automatic member access, block/removal state, stricter review RLS, member status output, and
admin-action audit fields. Existing IDs and content are preserved.

Supabase email confirmation remains enabled. A new account receives the `MEMBER` role and the
legacy `approved=true` compatibility value automatically, but access depends only on a confirmed
email and an account that is neither blocked nor removed. `approved` must not be presented as a
workflow state in new UI.

## Review submission contract

Call the authenticated Postgres RPC `submit_book_review` with:

```ts
{
  input_book_title: string;
  input_author: string;
  input_genre: string;
  input_rating: 1 | 2 | 3 | 4 | 5;
  input_thoughts: string;
  input_contains_spoilers: boolean;
  input_format: "Paperback" | "Hardback" | "E-book" | "Audiobook" | null;
  input_picked_by: string | null;
  input_start_date: string | null; // YYYY-MM-DD
  input_end_date: string | null; // YYYY-MM-DD
  input_spice_level: 0 | 1 | 2 | 3 | 4 | 5 | null;
  input_tear_level: 0 | 1 | 2 | 3 | 4 | 5 | null;
  input_made_me_feel: string[] | null;
  input_favourite_quotes: string | null;
  input_recommendation: "Yes" | "No" | "Maybe" | null;
}
```

The response is the new review UUID. New reviews are always `PENDING`; direct member inserts cannot
create a published review, and review owners cannot alter ownership, book, or moderation status.
The prior six-argument RPC remains as a compatibility overload for an already-deployed client.

`get_published_reviews()` is available to `anon` and `authenticated` and returns:

```ts
type PublishedReview = {
  id: string;
  bookId: string;
  title: string;
  body: string; // retained legacy alias/fallback
  bookTitle: string;
  bookAuthor: string | null;
  bookCoverUrl: string | null;
  overallRating: number | null;
  genre: string | null;
  format: "Paperback" | "Hardback" | "E-book" | "Audiobook" | null;
  pickedBy: string | null;
  startDate: string | null;
  endDate: string | null;
  spiceLevel: number | null;
  tearLevel: number | null;
  madeMeFeel: string[] | null;
  thoughts: string;
  favouriteQuotes: string | null;
  recommendation: "Yes" | "No" | "Maybe" | null;
  containsSpoilers: boolean;
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null; // only when profile visibility is PUBLIC
  };
  comments: Array<{
    id: string;
    body: string;
    createdAt: string;
    updatedAt: string;
    author: { id: string; firstName: string; lastName: string };
  }>;
};
```

Legacy reviews return nullable structured fields, with book title/author, rating, and thoughts
falling back to the existing book, rating, and body records. `get_admin_content()` returns the same
structured fields plus `status`, `reviewerId`, and `memberName` for moderation.

## Admin member endpoint

Function name: `admin-members`

- HTTP method: `POST` (plus CORS `OPTIONS`)
- URL: `/functions/v1/admin-members`
- Authentication: caller JWT in `Authorization: Bearer <jwt>`
- Authorization: verified, unblocked `ADMIN` role loaded from `public.users`
- Request: `{ "targetUserId": "uuid", "action": "..." }`

Actions:

| Action | Extra payload | Behaviour |
| --- | --- | --- |
| `password-reset` | none | Supabase sends a recovery link to `/reset-password`. |
| `resend-confirmation` | none | Supabase resends the signup confirmation to `/verify-email`. |
| `block` | none | Applies an Auth ban and marks the application member blocked. |
| `unblock` | none | Removes the Auth ban and restores member access. |
| `remove` | `"confirmation": "REMOVE"` | Deletes the Auth identity and anonymises the retained application/content owner row. |

Success response (`200`):

```json
{
  "success": true,
  "action": "block",
  "member": {
    "id": "uuid",
    "role": "MEMBER",
    "verified": true,
    "blocked": true,
    "status": "BLOCKED"
  }
}
```

Error response:

```json
{ "code": "LAST_ADMIN_PROTECTED", "message": "The last active administrator cannot be blocked or removed." }
```

Important status/error codes:

| HTTP | Code | Meaning |
| --- | --- | --- |
| 400 | `INVALID_ACTION`, `INVALID_TARGET` | Invalid action or target UUID. |
| 401 | `AUTH_REQUIRED` | Missing/invalid caller JWT. |
| 403 | `ADMIN_REQUIRED`, `ORIGIN_NOT_ALLOWED` | Caller is not a trusted active admin or the browser origin is rejected. |
| 404 | `MEMBER_NOT_FOUND`, `AUTH_ACCOUNT_NOT_FOUND` | Target application/Auth record is absent. |
| 409 | `SELF_PROTECTION` | Admin attempted to block or remove themselves. |
| 409 | `LAST_ADMIN_PROTECTED` | Action would remove the last active administrator. |
| 409 | `ALREADY_VERIFIED`, `MEMBER_BLOCKED` | Email action is not valid for current status. |
| 409 | `REMOVAL_CONFIRMATION_REQUIRED` | Remove request omitted the deliberate confirmation value. |
| 502 | `RESET_DELIVERY_FAILED`, `CONFIRMATION_DELIVERY_FAILED` | Supabase could not send the email. |
| 502 | `AUTH_BLOCK_FAILED`, `AUTH_UNBLOCK_FAILED`, `AUTH_DELETE_FAILED` | Privileged Auth operation failed. |

The function never accepts a caller role in its body and never returns or logs tokens, passwords,
service keys, or email-link contents. Every accepted action attempt writes success/failure audit data
with actor, target (when resolved), target email, action, timestamp, error code, and non-sensitive
metadata.

Removal intentionally retains the `public.users` row and changes its attribution to “Former
member”. Profile personal data is cleared and private. Reviews, comments, attendance, contributions,
suggestions, votes, discussions, payments, and AI-memory ownership therefore remain referentially
intact instead of following existing destructive cascades.

## Member-list status

`get_admin_overview()` member entries include:

```ts
{
  emailVerified: boolean;
  verified: boolean;
  blocked: boolean;
  role: "ADMIN" | "MEMBER";
  status: "VERIFIED" | "UNVERIFIED" | "BLOCKED" | "REMOVED";
  deletedAt: string | null;
}
```

`approved` remains temporarily present and always true for compatibility. Do not use it to derive
status or access.

## Fallback mode

`payment_method_settings.fallback_enabled` is public-readable and admin-writable under existing
RLS. The Operations Settings switch persists this value. When true, public SPA routes redirect to
the root `/fallback.html`; `/admin`, `/login`, `/verify-email`, and `/reset-password` remain in the
application so fallback mode can be disabled and Auth links still work. Vite builds
`ui/fallback.html` as the separate web-root `dist/fallback.html` entry.

## Deployment and manual checks

From `backend/`, deploy migration and functions after reviewing the linked project:

```sh
npx supabase migration list --linked
npx supabase migration up --linked --include-all
npx supabase functions deploy admin-members --project-ref <project-ref>
npx supabase functions deploy broadcast --project-ref <project-ref>
npx supabase functions deploy ai-chat --project-ref <project-ref>
```

Deploy the UI only after the migration because it selects the new status and fallback columns.

No Supabase dashboard Auth setting needs to change. Email confirmation remains enabled. Confirm
that the dashboard URL allow-list contains the production and local verification/recovery URLs
already declared in `backend/supabase/config.toml`. Test all actions with disposable accounts,
including a standard member receiving `403`, self/last-admin protection, and block/unblock login.
