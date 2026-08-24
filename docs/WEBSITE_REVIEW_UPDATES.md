# Website Review Updates

## Scope

This update applies the comments in `wineandchapter website.pdf` and the supplied book-review and
logo references.

## Public-site changes

- Replaced the existing logo with the supplied circular Wine & Chapters design. The production
  asset is `ui/public/img/wine-chapters-logo.png`, with the exterior of the circle made transparent.
- Removed the Home navigation item, meeting-cadence hero badge and dark-theme control.
- Replaced the homepage introduction with the approved books, wine, coffee and community copy.
- Changed the primary homepage action to “Start your new chapter here”.
- Updated the homepage and About story to describe Shix Sasha’s founder story and the purpose of the
  community.
- Replaced the fictional timeline and duplicate statistic panels with values and a direct join CTA.
- Added the founder image extracted from the PDF to the Why Join section.
- Replaced placeholder testimonials with the supplied member quote and the PDF-extracted circular
  member portrait.
- Removed paid membership tiers and Paystack membership controls from the public membership page.
- Updated contact details to `hello@wineandchapters.co.za` and
  `@wine_and_chapters_bookclub`.

## Reviews

The new `/reviews` route translates the supplied paper sheet into accessible React controls. A
signed-in submission:

1. Finds the named title in the existing `books` catalogue.
2. Upserts the member’s 1–5 star rating.
3. Stores the written review and structured review details in `reviews` with `PENDING` moderation
   status.

If a title is not yet in the catalogue, the member is asked to have the committee add it first.

## Event contributions

The Events page accepts a preset or custom ZAR contribution and opens Paystack checkout. Guest and
member contributions are recorded in `contribution_orders`; signed-in member payments are also
mirrored into `payments` after Paystack webhook verification.

Production rollout:

1. Apply `backend/supabase/migrations/20260818203000_contribution_orders.sql`.
2. Deploy the updated `paystack-checkout` Edge Function.
3. Deploy the updated `paystack-webhook` Edge Function.
4. Confirm `PAYSTACK_SECRET_KEY` and `PUBLIC_APP_URL` are set for the Edge Functions.
5. Complete a low-value Paystack test and confirm the order reaches `PAID` after the webhook.

## Verification

Run:

```bash
npm --prefix ui run typecheck
npm --prefix ui run lint
npm --prefix ui run build
npm --prefix backend run typecheck
```

The existing UI lint warnings about Fast Refresh exports are unrelated to this change; there are no
lint errors.
