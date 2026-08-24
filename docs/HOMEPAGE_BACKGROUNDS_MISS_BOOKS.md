# Homepage backgrounds and Meet Miss Books

Implemented on 24 August 2026 from `agent/HOMEPAGE_UI.md`.

## Homepage background pass

- The existing hero is unchanged.
- Every major homepage section below the hero now sits in a full-width wrapper that alternates between the supplied blush watercolor and quiet paper artwork.
- The section assets are served from `ui/public/img/sections/`. WebP variants reduce the combined background transfer size while PNG fallbacks retain compatibility.
- Backgrounds use centered cover treatment on larger screens and edge-preserving mobile treatment. Content remains fully opaque and existing cards, spacing, controls, and footer styling are preserved.
- Previous homepage-only gradient and decorative splash layers were removed where they competed with the new artwork.

## Meet Miss Books

- A compact introduction appears between member testimonials and the current-read section.
- It explains book discovery, price and availability comparison, reviews, recommendations, authors, club reads, and events, while distinguishing live public sources from Wine & Chapters member data.
- “Ask Miss Books” dispatches a frontend event to the existing Books widget. The widget opens and its message field receives keyboard focus; no request is made merely by rendering the section.
- Public-facing assistant references use “Miss Books”, while the compact widget header remains “Books”.
- The supplied character artwork was encoded with a visible checkerboard rather than transparency. Its connected checkerboard background was removed, with an optimized WebP served ahead of the corrected alpha PNG fallback at `ui/public/img/missbooks.png`.

## Accessibility and responsive behavior

- The section uses a labelled landmark, semantic capability list, descriptive image alternative, real button control, and existing focus-visible widget styles.
- Desktop presents copy and artwork side by side. Mobile keeps the copy and CTA first, places the artwork below, and avoids horizontal overflow.
- Existing global reduced-motion behavior continues to apply; the new CTA introduces no extra animation or automatic network activity.

## Verification

- UI typecheck and production build pass.
- Desktop viewport: 1440 × 1100, no horizontal overflow.
- Mobile viewport: 390 × 844, no horizontal overflow.
- Browser interaction check confirms the CTA opens the widget and focuses `#demo-chat-message` while the compact header remains “Books”.
