# Homepage, Events, Gallery and Shop UI Update

## Summary

The public site keeps its existing Wine & Chapters architecture, hero, typography, interaction language, and dynamic Supabase data while giving each homepage chapter a subtle editorial surface.

## Homepage

- The Current Book remains connected to `publicApi.getHome`; no book title or author is hardcoded.
- A compact Review discovery strip separates About from Current Book and routes to `/reviews`; no review form or published review feed is duplicated on Home.
- Current Book keeps its cool sage-grey chapter and Why Join stays warm and restrained. Join and Newsletter retain their existing roles with more breathing room.
- Home uses `publicApi.getEvents` to show only the nearest upcoming event teaser. The interactive calendar is no longer rendered on Home.
- The final homepage social-proof chapter is a compact horizontal club-testimonial carousel with a small circular member portrait or initials fallback. It is separate from all published book-review data and interactions.
- A reusable `WatercolorSplash` component and shared CSS variants position the supplied transparent PNG at selected section edges. Decorations are non-interactive, hidden from assistive technology, clipped by their containers, and reduced or hidden on mobile.

## Events calendar

- `/events` retains the authenticated/public event query switch, list cards, RSVP mutation, remaining-seat and attendance data, contribution amounts, and the Paystack contribution card.
- Its Calendar tab now uses the shared `EventCalendar` component for a proper month grid with previous/next navigation, selected dates, visible event markers, accessible event-count labels, and an initial month chosen around the nearest relevant event.
- Multiple events on the same date are ordered by start time and exposed through labeled event selectors. The selected event is rendered with the existing `MemberEventCard`, so RSVP logic is not duplicated.
- Calendar details stack under the month on mobile, keep touch-friendly controls, and introduce no horizontal overflow at 375px.

## Gallery

- `/gallery` is a dedicated discovery experience built from the supplied Wine & Chapters photographs and existing videos.
- The complete media composition remains on its own route without a duplicate gallery preview on Home.

## Reviewer profile images

The migration `20260824120000_public_review_profile_images.sql` extends `get_published_reviews()` with the matching author's `avatarUrl`. Only profiles explicitly set to `PUBLIC` expose an image through the anonymous endpoint. Reviews without a public image use branded initials, so member photos are never guessed or randomly assigned.

## Shop

- The shared navigation label now reads `Shop` on desktop and mobile and links to the dedicated `/shop` route.
- `/shop` renders a minimal coming-soon page without products, prices, stock, carts, checkout, or ecommerce API calls.
- Existing joining actions continue to link directly to `/register`; `/membership` remains only as a backward-compatible redirect to that registration flow.
- Shop metadata replaces the previous membership metadata.
- Shared membership data remains in place for any other consumers.

## Contact and email safety

The public contact address remains `hello@wineandchapters.co.za`. Transactional SMTP sender and email-function configuration were not changed as part of this update.

## Validation

- UI type-check passes.
- UI lint passes with only the repository's existing Fast Refresh warnings.
- Production UI build passes.
- Browser checks cover 375px and 1440px widths with no horizontal overflow.
- Live browser data confirmed two events on the same date render as two selectable event details in the real month calendar.
- Desktop and mobile Shop layouts were visually reviewed.
