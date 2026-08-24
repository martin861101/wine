# UI fixes implementation

Implemented on 19 August 2026.

## Public experience

- Home and About videos have no poster image. They retain their layout while loading
  and fade in on `canplay`; reduced-motion preferences shorten the transition.
- The landing-page gallery was removed.
- Homepage current-read and next-event cards use `get_public_home()`. Missing records
  render intentional empty states and never fall back to demo content.
- `/events` uses published, non-past database events for visitors and members.
- `/reviews` rotates one consistently sized published review at a time, pauses during
  interaction, supports manual navigation, and allows authenticated comments.
- `wine-chapters-logo.png` is configured as the route and document favicon.

## Member clubhouse and authentication

- Login accepts a validated local `redirect` destination and defaults to `/portal`.
  Existing authenticated sessions bypass the login form and return to that destination.
- Supabase session persistence remains the only auth source; no duplicate portal auth
  state or token store was added.
- The portal uses the admin-selected current read, published events and active polls.
- Members can search Open Library through the authenticated `open-library-search`
  Edge Function, submit edition-aware suggestions, view privacy-safe community
  activity, vote, review, comment, RSVP, and participate in discussions.

## Administration

- Event image add/preview/replace/remove is inside Event Details.
- Events support create, edit, draft/publish, image management and confirmed deletion.
- Admin moderation covers review publish/hide, comment removal and suggestion status.
- Poll creation supports manual candidates or titles copied from member suggestions,
  an optional close time, and hidden results.
- Current read selection remains one database-backed source shared by home and portal.

## Database and APIs

Migration `20260819143000_ui_fixes_dynamic_content.sql` adds `review_comments`, RLS,
indexes, book suggestion identity deduplication, public content RPCs, the member
activity RPC, and the admin moderation RPC.

New RPCs:

- `get_public_home()`
- `get_public_events()`
- `get_published_reviews()`
- `get_community_activity()`
- `get_admin_content()`

New Edge Function: `open-library-search` (renamed from the original provider-specific endpoint).

## Email and configuration

SMTP and legacy provider messages are wrapped in a shared inline-CSS branded email
layout. Contact submissions send a branded acknowledgement. Supabase Auth confirmation,
recovery, and invitation templates are in `backend/supabase/templates/`.

Open Library requires no API key. Existing SMTP settings and `PUBLIC_APP_URL` remain
required for production email. Deploy from `backend/` with:

```sh
supabase db push --include-all
supabase config push
supabase functions deploy open-library-search --no-verify-jwt
supabase functions deploy contact --no-verify-jwt
supabase functions deploy broadcast
```

## Verification

- UI typecheck and production build pass.
- UI lint passes with seven pre-existing Fast Refresh warnings and no errors.
- Backend typecheck, build, and authentication/password tests pass.
- Full browser journeys require a deployed Supabase migration and representative
  visitor/member/admin accounts.

## Production deployment

Deployed to Supabase project `ykyzelgoeblxhcdguyww` on 19 August 2026:

- migrations `20260818203000` and `20260819143000`;
- Auth confirmation, recovery, and invitation templates;
- the original book-search function was deployed as v1 and is superseded by `open-library-search`;
- `contact` v9;
- `broadcast` v9.

Remote public RPC smoke tests passed. At deployment time the production database had
no current read, upcoming event, or published review, so the UI intentionally renders
its new empty states until administrators publish content.
