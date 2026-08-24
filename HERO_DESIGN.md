Agent — Wine & Chapters Hero Redesign

Work inside the existing Wine & Chapters codebase.

Objective

Redesign ONLY the homepage hero section into a high-impact, premium, romantic/editorial experience.

The client specifically wants a WOW factor, but it must remain elegant rather than becoming animation-heavy or gimmicky.

Primary visual reference

Use the new asset:

"ui/public/img/hero_bg.png"

Inspect this image before making changes. It was created specifically for this hero and should drive the composition.

Do not edit, replace, regenerate, crop permanently, or recreate this artwork with CSS.

Visual Direction

Create a hero inspired by a luxury editorial/book-club experience rather than a conventional website.

Desktop composition:

- Full viewport or approximately "90-100vh".
- Left side contains the primary typography/content.
- "hero_bg.png" dominates the right side.
- Preserve the woman, book, wine, sunset and important image composition.
- The existing pink brand colour remains intentional and prominent.
- Use the artwork's existing pink/watercolour area to naturally blend the content area into the photograph.
- Avoid a hard 50/50 split.
- Avoid obvious rectangular image containers.
- The boundary between content and imagery should feel organic, like watercolour/torn handmade paper.
- Maintain the existing Wine & Chapters branding and navigation.

Suggested hierarchy:

WINE & CHAPTERS

Large elegant editorial serif treatment.

Supporting line similar to the existing brand voice. Do not introduce excessive marketing copy.

Primary CTA: JOIN THE CLUB

Secondary CTA: DISCOVER THIS MONTH'S READ

Use existing routes/actions wherever available. Do not break or duplicate existing functionality.

WOW Animation

The hero should initially feel almost like a still illustration and then subtly come alive.

Initial entrance

Create a cinematic staged reveal:

1. Begin primarily with the soft pink/paper area.
2. Reveal "hero_bg.png" organically from right toward centre.
3. The reveal should resemble watercolour spreading / handmade paper uncovering the scene — NOT a straight wipe.
4. Main typography fades in with slight blur + vertical movement.
5. Supporting copy follows.
6. CTAs appear last.

Keep the sequence approximately 2–3 seconds, smooth and premium.

Use existing animation dependencies where appropriate. If Framer Motion/Motion is already installed, prefer it rather than introducing another animation library.

Living Scene

After entrance, movement should become extremely subtle.

Implement restrained effects such as:

- Very slow background scale/drift ("~1.00 → 1.02").
- Tiny depth/parallax response to pointer movement on desktop.
- Optional 3–5 lightweight drifting petals across the composition.
- Petals must be CSS/SVG/lightweight elements — no particle framework.
- Gentle movement only.
- No continuous distracting animation.

The desired reaction is:

"Wait... is that painting moving?"

not:

"Look at all these animations."

Scroll Interaction

As the user begins scrolling:

- Apply subtle parallax to the artwork.
- Hero content can move/fade at a slightly different rate.
- Gradually transition into the existing About section.
- Do NOT redesign the About section.
- The existing interactive/page-turning book must remain the star of About.

The experience should feel:

Enter the world → painting comes alive → scroll into the story → discover the interactive book.

Optional Detail

If appropriate with the existing data architecture, add a restrained bottom overlay showing the current book:

"Currently Reading"
Book cover / title / rating

ONLY use existing real/dynamic data. Do not hard-code a fake book or event.

If implementing this would require substantial backend/data changes, skip it.

Mobile

Do not simply shrink the desktop layout.

Create a deliberate mobile composition:

- Keep the woman/book visible.
- Reposition/crop the background using "object-position" / background positioning.
- Maintain readable typography.
- Reduce animation complexity.
- Disable pointer parallax.
- Reduce/remove decorative petals if needed.
- Ensure CTAs remain obvious.
- Avoid horizontal overflow.
- Hero should still feel premium on a phone.

Accessibility / Performance

Respect:

"prefers-reduced-motion"

When enabled, remove parallax, drifting elements and complex reveal animation while retaining a beautiful static hero.

Also:

- Avoid layout shift.
- Lazy-load anything below the fold where appropriate.
- Do not add large animation libraries unnecessarily.
- Keep animation GPU-friendly ("transform", "opacity", masks where practical).
- Ensure text contrast remains accessible.
- Preserve semantic heading structure.

Important Constraints

Do NOT:

- redesign other homepage sections;
- alter the existing About book functionality;
- modify "hero_bg.png";
- replace the supplied artwork;
- introduce generic SaaS cards;
- add glassmorphism everywhere;
- use bouncing buttons;
- add excessive floating elements;
- turn the hero into a carousel;
- hard-code dynamic content;
- break existing navigation/auth/member functionality;
- perform unrelated refactors.

Before editing, inspect:

1. Existing homepage implementation.
2. Existing hero component/styles.
3. Existing animation dependencies.
4. Existing theme/design tokens.
5. Existing routes and CTA behaviour.
6. "ui/public/img/hero_bg.png".
7. The About section immediately following the hero so the transition works naturally.

Then implement the hero using the existing architecture and conventions wherever possible.

Final Quality Pass

After implementation:

- Run the relevant lint/type/build checks.
- Check desktop, tablet and mobile layouts.
- Check reduced-motion behaviour.
- Check that the artwork remains properly composed at common aspect ratios.
- Check that navigation remains usable over the hero.
- Check the hero → About transition carefully.

Do not stop at "technically working."

Spend the final pass specifically evaluating composition, typography, spacing, animation timing and visual polish.

The target is a hero that could belong to a professionally art-directed editorial/lifestyle brand while still unmistakably feeling like Wine & Chapters.

## Mobile

**fyi mobule is actually mobile**

Agent Modification — Dedicated Mobile Hero Artwork

Update the Wine & Chapters hero implementation plan to use two purpose-built hero assets.

Hero Assets

Desktop / tablet:

"ui/public/img/hero_bg.png"

Mobile:

"ui/public/img/hero_mobule.png"

Important: "hero_mobule.png" is the intentional existing filename. Do not rename it.

Inspect both images before implementing the responsive hero.

Responsive Image Behaviour

Do NOT attempt to make "hero_bg.png" work on narrow mobile screens through aggressive cropping.

Use the dedicated portrait artwork for mobile.

Prefer an appropriate responsive implementation such as "<picture>", responsive image sources, or the cleanest equivalent supported by the existing architecture.

Target behaviour:

- Desktop and larger tablet → "hero_bg.png"
- Mobile / narrow viewport around "< 768px" → "hero_mobule.png"

Choose the exact breakpoint based on the existing project's responsive conventions rather than introducing an arbitrary conflicting breakpoint.

Mobile Composition

"hero_mobule.png" was specifically composed for portrait displays.

Use its available pink/watercolour negative space for hero typography while preserving:

- the woman;
- open book;
- wine;
- flowers;
- sunset;
- watercolour edge.

Do not cover the woman's face/book with text or CTAs.

The mobile layout does not need to reproduce desktop positioning exactly. Art-direct it independently.

Prioritise:

1. Brand/logo/navigation
2. Main hero statement
3. Supporting copy
4. Primary CTA
5. Secondary CTA
6. Artwork

Typography should scale fluidly using the project's existing responsive system or "clamp()" where appropriate.

Mobile Animation

Mobile should retain the WOW factor but use a simplified sequence.

Recommended:

0.0s — pink/paper composition visible
0.2–1.4s — artwork organically reveals
0.7–1.5s — heading emerges
1.2–1.8s — supporting content appears
1.5–2.1s — CTAs appear

Do not use pointer parallax on touch devices.

Reduce or disable:

- complex parallax;
- excessive petals;
- expensive mask updates;
- unnecessary continuous animation.

A very slow image drift/scale is acceptable if performance remains smooth.

Desktop Animation

Retain the previously specified richer desktop treatment:

- organic watercolour/torn-paper reveal;
- subtle pointer depth;
- slow artwork drift;
- restrained drifting petals;
- scroll parallax;
- transition into the existing About book section.

Performance

Do not download both full-resolution hero assets unnecessarily on mobile.

Implement responsive image loading so the browser can select the appropriate asset wherever practical.

Ensure:

- no major layout shift;
- sensible image sizing;
- appropriate loading priority for the above-the-fold hero;
- no accidental lazy-loading that delays the primary hero visual;
- GPU-friendly animation;
- "prefers-reduced-motion" support.

If the framework provides an optimized image component, inspect whether it is appropriate before falling back to a raw background image.

Final Responsive QA

Explicitly inspect/test:

- ~375px phone
- ~430px phone
- tablet portrait
- tablet landscape
- 1366px desktop
- 1920px desktop

Pay particular attention to the transition around the mobile/desktop artwork breakpoint.

There should never be a viewport where the composition suddenly becomes badly cropped.

The final goal is two intentionally art-directed versions of the same hero, not one desktop hero that merely happens to be responsive.
