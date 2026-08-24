# Agent — Wine & Chapters Homepage Background Pass

The two final static section background assets have now been added to the repository:

```text
ui/img/sections/splash_bg1.png
ui/img/sections/splash_bg2.png
```

Apply these to the **current Wine & Chapters homepage** to finally create clear visual separation between the major sections.

This is a focused styling task.

**Do not redesign or restructure the homepage.**

The existing hero remains completely unchanged.

---

## Goal

The homepage currently still feels like one long cream page despite previous attempts to visually separate sections.

We now have two purpose-made static backgrounds.

Use them to create a very obvious alternating rhythm:

```text
HERO — existing hero, untouched

SECTION
splash_bg1.png
↓
SECTION
splash_bg2.png
↓
SECTION
splash_bg1.png
↓
SECTION
splash_bg2.png
↓
...
```

The visitor should immediately perceive:

**section → new section → new section**

while scrolling.

Do not try to recreate this effect with CSS gradients or dynamically generated watercolor elements.

---

# 1. Assets

Use exactly:

```text
ui/img/sections/splash_bg1.png
ui/img/sections/splash_bg2.png
```

### `splash_bg1.png`

Pink/blush watercolor background with floral artwork around the outer edges and a clean central content area.

Use this as the stronger decorative chapter background.

### `splash_bg2.png`

Warm off-white/cream paper background with very subtle foliage shadows.

Use this as the quieter chapter background.

---

# 2. Important — Resolve Asset Paths Correctly

Inspect the current Vite/project asset handling before implementation.

The files currently exist under:

```text
ui/img/sections/
```

Do not blindly reference `/img/sections/...` unless that path is actually served by the current build configuration.

Either:

* import the assets through the existing Vite asset pipeline; or
* move them into the appropriate existing public/static asset directory if that matches the project's established convention.

Do not duplicate the files unnecessarily.

Ensure both backgrounds work in the production build, not only dev mode.

---

# 3. Hero

DO NOT TOUCH THE HERO.

Preserve:

* current hero image;
* sizing;
* positioning;
* content;
* buttons;
* responsive behaviour;
* existing animation/effects.

The alternating background system starts **below the hero**.

---

# 4. Alternate the Major Homepage Sections

Inspect the current homepage structure and apply the backgrounds to the actual existing major sections.

The intended rhythm is approximately:

```text
Hero
    existing hero — unchanged

Our Story / About
    splash_bg2

Review + Gallery discovery strip
    splash_bg1

Current Read
    splash_bg2

Why Join
    splash_bg1

Community
    splash_bg2

Upcoming Event teaser
    splash_bg1

Join CTA area
    splash_bg2

Newsletter
    splash_bg1

Member Testimonials
    splash_bg2

Footer
    existing footer treatment
```

Adapt this mapping if the current component ordering has changed slightly.

The important rule is:

### Alternate the two assets consistently.

Do NOT place the same background on several consecutive major sections.

---

# 5. Full-Width Section Backgrounds

The background belongs to the **section wrapper**, not an inner card.

Each background must span:

```text
100vw / full available page width
```

while the content remains inside the site's existing max-width container.

Conceptually:

```tsx
<section className="section-background">
    <div className="site-container">
        existing section content
    </div>
</section>
```

NOT:

```tsx
<section>
    <div className="card-with-background">
```

We want the entire horizontal page band to change while scrolling.

---

# 6. Background Behaviour

For both assets, start with:

```css
background-repeat: no-repeat;
background-position: center;
background-size: cover;
```

However, inspect the actual visual result.

Because these assets were specifically generated with clean central content areas, preserve those focal areas.

Do not zoom/crop them so aggressively that the watercolor/floral edges disappear.

If `cover` crops too much at a particular breakpoint, use an appropriate responsive background-size/position adjustment.

---

# 7. Do NOT Add Transparency

Important:

Do NOT lower the opacity of the entire section.

Do NOT put `opacity` on the section wrapper.

Do NOT fade these backgrounds to near-invisibility.

They were specifically generated at the intended visual strength.

Start with the assets exactly as supplied.

Only if text readability genuinely requires it may you introduce a **very subtle localized content treatment**, but do not wash out the entire background.

---

# 8. Remove Competing Decorative Backgrounds

The current homepage has previous watercolor splash decorations/components from earlier attempts.

Audit each section receiving one of the new static backgrounds.

If an existing:

* `WatercolorSplash`;
* CSS watercolor blob;
* pseudo-element splash;
* gradient decoration;
* decorative pink background;

visually competes with the new image, remove/disable that redundant decoration for that section.

Do NOT stack:

```text
static watercolor background
+
WatercolorSplash
+
pink gradient
+
another decorative blob
```

The new image should provide the section atmosphere.

Keep unrelated intentional foreground decoration where it still looks correct.

---

# 9. Preserve Existing Cards and Content

Do not redesign:

* About book;
* discovery strip;
* Current Read;
* Why Join content;
* Community;
* event teaser;
* Join CTA;
* newsletter;
* testimonial carousel.

Only adjust minor card/background contrast if required because of the new section background.

Existing white/cream cards can remain above the background.

Use appropriate layering:

```css
position: relative;
z-index: 1;
```

where necessary.

---

# 10. Section Boundaries

Do not introduce large borders or horizontal rules.

The **background change itself** should create the separation.

Maintain sufficient vertical padding so every section feels like its own chapter.

Avoid excessive whitespace.

The intended effect is:

```text
████ pink watercolor ████
        content
████ pink watercolor ████

░░░ warm off-white ░░░░░
        content
░░░ warm off-white ░░░░░

████ pink watercolor ████
        content
████ pink watercolor ████
```

rather than everything sitting on one continuous beige canvas.

---

# 11. Current Read

The Current Read section previously had a pale grey/neutral treatment.

Since we now have the final two-background system, integrate it into the alternating rhythm.

Do not introduce a third large section background purely for Current Read.

The book cover/card itself can retain existing styling and contrast.

---

# 12. Join CTA

The existing Join CTA already contains its own blush/pink panel.

When its surrounding section uses `splash_bg2.png`, preserve the CTA card itself.

This gives us:

```text
quiet off-white background
        ↓
strong contained pink CTA
```

which provides better hierarchy than pink-on-pink.

---

# 13. Testimonials

Keep the new member testimonial carousel functionality exactly as implemented.

Do not confuse it with book reviews.

Only change its outer section background according to the alternating sequence.

Do not modify testimonial:

* data;
* images;
* names;
* carousel behaviour;
* controls.

---

# 14. Footer

Do not force one of the new section backgrounds onto the Footer unless visual inspection shows it is necessary.

The footer should remain a clear final boundary.

Preserve its current branding and layout.

---

# 15. Mobile

The backgrounds must work properly on mobile.

For narrower screens:

* preserve the central clean reading area;
* prevent awkward floral artwork directly behind text;
* adjust `background-position` where necessary;
* do not tile the image;
* do not cause horizontal overflow.

It is acceptable to use different positioning such as:

```css
background-position: center top;
```

at mobile breakpoints if it produces a better crop.

Do not remove the backgrounds entirely on mobile.

---

# 16. Performance

These are large static background assets.

Inspect their current file sizes.

If they are unnecessarily large for web delivery, create optimized WebP versions while preserving the original PNGs.

Prefer the optimized assets in production if there is a meaningful size reduction without visible degradation.

Do NOT aggressively compress them until watercolor texture/banding becomes visible.

Do not alter the artwork itself.

---

# 17. Final Visual Inspection

This task is not complete merely because the CSS compiles.

Run the homepage and inspect the actual full-page result.

The most important acceptance test is:

> When scrolling from the hero to the footer, can you immediately see where one major homepage section ends and another begins?

If the answer is no, adjust background sizing/positioning and section padding.

Do NOT solve it by adding more decorations.

The two supplied assets are the visual system.

---

# 18. Do Not Touch

Do not modify:

* Hero;
* Books AI;
* Gemini;
* Tavily;
* Open Library;
* Supabase AI functions;
* Events functionality;
* Reviews functionality;
* Gallery functionality;
* registration;
* Shop;
* testimonial data;
* navigation;
* backend APIs.

This is a homepage **background styling pass only**.

---

## Final Target

The visual rhythm should be deliberately simple:

**Hero photography**

↓

🌿 **quiet off-white section**

↓

🌸 **pink watercolor section**

↓

🌿 **quiet off-white section**

↓

🌸 **pink watercolor section**

↓

🌿 **quiet off-white section**

↓

🌸 **pink watercolor section**

…and so on.

No more attempting to generate section separation through lots of small floating splashes.

Use the two supplied backgrounds as the actual full-width alternating section canvases.


# Agent Task 2.

Implement a compact **“Meet Miss Books”** homepage section for Wine & Chapters.

* Use the new transparent Miss Books artwork provided as the main visual (ui/public/img/missbooks.png).
* Place the section after the member testimonials and before **This Month’s Read**.
* Give it a visually distinct soft pink/cream background with a subtle decorative paint/splash treatment consistent with the other alternating sections.
* Desktop: artwork and content side-by-side.
* Mobile: content first, artwork below, correctly scaled with no clipping.
* Heading: **Meet Miss Books**
* Copy: **Your bookish AI companion with access to the wider web. Discover your next read, compare prices, find trusted reviews, explore authors, check club events, and navigate Wine & Chapters—all through a simple conversation.**
* Add four compact capability items:

  * Find books and authors
  * Compare prices and availability
  * Discover reviews and recommendations
  * Explore club reads and events
* Add an **Ask Miss Books** CTA that opens the existing Books AI widget and focuses its input.
* Preserve **Books** as the widget’s compact label, but refer to the assistant as **Miss Books** everywhere else.
* Ensure the section does not make external API calls when loading.
* Miss Books should use live web search for external book information instead of Google Books. Clearly distinguish web results from Wine & Chapters/Supabase club data.
* Add accessible alt text, keyboard support, responsive styling and respect reduced-motion preferences.
* Remove any remaining Google Books API dependencies only if they are directly connected to the assistant’s book-search flow.
* Reuse existing theme components and styling patterns; do not redesign unrelated sections.
* Verify desktop and mobile layouts and run the existing lint/build checks.
