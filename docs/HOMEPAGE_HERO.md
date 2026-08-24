# Homepage Hero

The homepage hero is an editorial, artwork-led introduction to Wine & Chapters. It is intentionally isolated from the rest of the homepage so the About storybook and all following sections keep their existing structure and behaviour.

## Responsive artwork

- `ui/public/img/hero_bg.png` is used from the existing 768px breakpoint upward.
- `ui/public/img/hero_mobile.png` is used below 768px through a native `<picture>` source, so browsers do not need to fetch both full-resolution images.
- The hero image is eager/high-priority above the fold and includes intrinsic dimensions to avoid layout shift.
- Phone layouts use the portrait composition with copy held in the upper negative space. Tablet portrait uses the full landscape artwork as a contained lower scene so the key subject and watercolour edge remain visible.

## Motion and interaction

- Motion provides a right-to-centre organic clip-path reveal followed by staged typography, supporting copy, and CTA entrances.
- Desktop mouse input adds only a few pixels of spring-smoothed depth.
- The artwork and copy move at slightly different rates as the hero leaves the viewport.
- Four lightweight CSS petals and a slow 1.002–1.02 artwork drift create the living-painting effect on larger screens.
- `prefers-reduced-motion: reduce` removes the reveal, pointer/scroll parallax, petals, and continuous drift while preserving the complete static composition.

## Actions and semantics

- The semantic `h1` is “Wine & Chapters”.
- “Join the club” uses the existing `/register` route.
- “Discover this month's read” targets the dynamic monthly-read section on the same page; no book data is hard-coded into the hero.
- The artwork is decorative because the same information is conveyed by the visible brand copy.

## QA

The layout was visually checked at 375px, 430px, 768px portrait, 1366px, and 1920px, including a forced reduced-motion render. The production Vite build completes successfully.
