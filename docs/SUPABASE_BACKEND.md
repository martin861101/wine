# Supabase Backend and xneelo UI

## Production architecture

The production UI is hosted by xneelo at `https://wineandchapters.co.za`. Supabase project `ykyzelgoeblxhcdguyww` provides the complete backend:

- Supabase Auth for signup, verification, login, recovery, and sessions.
- Postgres and PostgREST for application data and browser-facing queries.
- Row-level security for member ownership and administrator permissions.
- Database RPC functions for composite member and administrator views.
- Supabase Storage for the public `event-photos` bucket.
- Edge Functions for contact submission and administrator broadcasts.
- An authenticated `ai-chat` Edge Function for the live reading-room companion.

The legacy Node API under `backend/src/` is not deployed in this architecture.

## UI configuration

Create `ui/.env.production` from `ui/.env.example` before building the static UI on a development machine:

```env
VITE_SUPABASE_URL=https://ykyzelgoeblxhcdguyww.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
VITE_ENABLE_DEMO_FALLBACK=false
```

The publishable key is safe to include in the browser because RLS is the authorization boundary. Never put a Supabase secret/service-role key, database password, SMTP password, or third-party secret in a `VITE_*` variable.

Build and deploy the frontend without Node.js on xneelo:

```sh
npm install
npm --prefix ui run build
```

Upload the **contents** of `ui/dist/` to the xneelo domain's `public_html` directory. The upload must include `index.html`, `assets/`, and the hidden `.htaccess` file. The `.htaccess` rewrite returns `index.html` for client-side routes such as `/verify-email` and `/reset-password`. Do not upload `ui/.env.production`; its public values are compiled into the generated assets.

## Trusted URLs and Auth email

`backend/supabase/config.toml` declares:

- Site URL: `https://wineandchapters.co.za`
- Verification callback: `https://wineandchapters.co.za/verify-email`
- Password callback: `https://wineandchapters.co.za/reset-password`
- Local equivalents on `http://127.0.0.1:5178`
- Eight-character passwords requiring upper/lowercase letters and digits
- Email confirmation before login

Supabase Auth uses the xneelo SMTP mailbox for confirmation and password-recovery messages. SMTP connects through xneelo's certificate-valid canonical hostname `www7.jnb3.host-h.net`; the vanity `smtp.wineandchapters.co.za` hostname currently presents a certificate that does not cover it. The SMTP password is supplied through the ignored `.env.supabase` file and must never be committed.

An SMTP `535 Login denied` response means xneelo rejected `SMTP_USER`/`SMTP_PASSWORD`. Update the mailbox password in `.env.supabase`, then push both Auth configuration and Edge Function secrets again before relying on signup or contact email.

Run config commands from `backend/`, not the repository root, to ensure the CLI loads `backend/supabase/config.toml`:

```sh
cd backend
npx supabase config push
```

## Database and authorization

Apply pending migrations from `backend/`:

```sh
cd backend
npx supabase db push
npx supabase db lint --linked --schema public --level warning --fail-on error
```

Migration `20260817145733_supabase_native_backend.sql` creates the complete schema, links `auth.users` to application members, enables RLS, creates browser-safe RPC functions, and provisions Storage policies. Migration `20260817152100_backfill_auth_users.sql` safely links Auth accounts that existed before the trigger was installed.

New Auth accounts create or link an application `users` row by email. Existing legacy member IDs remain stable through `users.auth_user_id`, preserving foreign-key relationships. New members cannot access member data until their email is verified and an administrator sets `approved=true`.

The first production administrator, `hello@wineandchapters.co.za`, has been created in Supabase Auth and explicitly promoted. Subsequent member approvals can be performed in the application dashboard. To promote a replacement account deliberately, use the Supabase SQL editor:

```sql
UPDATE public.users
SET role = 'ADMIN', approved = true
WHERE email = 'the-confirmed-admin@example.com';
```

The principal RPCs used by the UI are:

- `get_widget_home()`
- `get_events()`
- `get_discussions()`
- `get_admin_overview()`
- `admin_update_member(...)`
- `admin_set_current_read(...)`
- `subscribe_newsletter(...)`

## Edge Functions

Deploy from `backend/`:

```sh
npx supabase functions deploy contact --no-verify-jwt
npx supabase functions deploy broadcast
npx supabase functions deploy ai-chat
npx supabase functions deploy paystack-checkout
npx supabase functions deploy paystack-webhook
npx supabase secrets set CORS_ORIGIN=https://wineandchapters.co.za \
  CONTACT_EMAIL=hello@wineandchapters.co.za
```

`contact` accepts anonymous website submissions only from the configured origin, persists every valid message in `contact_messages`, and delivers it through the configured xneelo SMTP mailbox.

`broadcast` requires a verified, approved administrator JWT and delivers through the same SMTP mailbox. The Edge Function secrets `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `EMAIL_FROM` must be configured.

`ai-chat` requires a verified, approved member session, reads club context, and lets Gemini combine Open Library, Tavily web search, the safe webpage reader, and existing UI actions. It uses the server-side `GEMINI_API_KEY`, `GEMINI_MODEL`, and `TAVILY_API_KEY` secrets. The UI calls it through the Supabase browser client; no provider secret or standalone Node API URL is used by the browser.

```sh
cd backend
npx supabase secrets set GEMINI_API_KEY=... GEMINI_MODEL=... TAVILY_API_KEY=...
npx supabase functions deploy ai-chat
npx supabase functions deploy open-library-search --no-verify-jwt
```

`paystack-checkout` accepts a server-defined paid membership tier and customer email, creates a pending membership order, initializes Paystack, and returns the hosted checkout URL. The amount cannot be supplied by the browser. It also verifies the transaction when Paystack returns to `/membership`.

`paystack-webhook` verifies `x-paystack-signature` with HMAC-SHA512 before marking a matching membership order and linked member as paid. Configure this Paystack webhook URL:

```text
https://ykyzelgoeblxhcdguyww.supabase.co/functions/v1/paystack-webhook
```

`PAYSTACK_SECRET_KEY` must be a valid Paystack secret key (`sk_test_...` or `sk_live_...`) in `backend/.env` and Supabase Edge Function secrets. Never place it in a `VITE_*` variable.

The hosted checkout flow does not require the Paystack public key in the browser: both
checkout initialization and verification happen in Edge Functions using the server-side
secret. Test-mode credentials were registered in Supabase on 19 August 2026. Before launch,
replace the test secret with a live secret and configure the same webhook URL in the live
Paystack dashboard. An unsigned production webhook smoke test must return HTTP 401.

The UI and Edge Functions must be deployed together when payment actions change. A stale
`paystack-checkout` function may treat a contribution request as a membership request and
return `Membership tier is required`. Redeploy both payment functions in that case. The UI
extracts the JSON error body from failed Edge Function calls so members see this actionable
message instead of the generic `Edge Function returned a non-2xx status code`.

Event images are uploaded by approved members to the public `event-photos` bucket. The administrator event form accepts JPG, PNG, WebP, or GIF files up to 8 MB, records the upload in `event_photos`, and sets the event cover image.

## Deployment checks

```sh
npm run typecheck
npm test
npm run build:all
npm run lint
```

After deploying the xneelo UI, test signup confirmation, password recovery, member approval, login, the member hub, contact submission, and an administrator action using non-production test accounts.

The xneelo virtual host must serve a certificate whose SAN includes `wineandchapters.co.za`. A generic `*.jnb3.host-h.net` certificate does not validate for the production domain and will prevent Auth callback links from opening securely.
