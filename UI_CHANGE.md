# AGENT — Wine & Chapters Website Update

Implement the following changes to the existing **Wine & Chapters** application.

This is an existing working application. **Do not rebuild or redesign the site from scratch.** Preserve the current architecture, branding, functionality, dynamic data and responsive behaviour while implementing the requested changes.

## Repository Context

Repository: `martin861101/wine`

Frontend:
`ui/`

Important existing locations:

* Homepage: `ui/src/routes/index.tsx`
* Membership page: `ui/src/routes/membership.tsx`
* Contact page: `ui/src/routes/contact.tsx`
* Events page: `ui/src/routes/events.tsx`
* Root layout: `ui/src/routes/__root.tsx`
* Navbar: `ui/src/components/site/navbar.tsx`
* Shared styles: `ui/src/styles.css`
* Shared data: `ui/src/data/`
* API layer: `ui/src/lib/`
* Public assets: `ui/public/`

The frontend currently uses React, Vite, TanStack Router, React Query and the existing component/design system.

Inspect the relevant files before making changes.

---

# DESIGN DIRECTION

The website already has a strong romantic/editorial Wine & Chapters aesthetic.

Do not replace it.

The goal of this update is to make the page flow feel:

**white, airy, romantic, feminine, editorial and premium.**

White should become the dominant background through the content sections.

Use the existing Wine & Chapters pink palette as an accent rather than filling entire sections with pink.

Preserve:

* existing typography;
* existing buttons;
* existing cards where appropriate;
* current border radiuses;
* existing animation language;
* existing responsive behaviour;
* existing hero;
* existing About book interaction;
* current brand identity.

Avoid making the page look like a generic SaaS landing page.

---

# WATERCOLOR SPLASH SYSTEM

A new transparent **pink watercolor splash PNG** has been supplied/added to the project.

Use this image as a recurring decorative motif that visually connects the homepage to the watercolor aesthetic of the hero.

## Important

The watercolor image is NOT a section background.

Do not stretch it across the entire viewport.

Instead, treat it as an atmospheric decorative layer appearing around selected section boundaries.

The idea should feel like:

> watercolor from the hero artwork is subtly bleeding into the rest of the website.

## Implementation

Create a reusable treatment/class/component rather than repeating lots of one-off positioning logic.

Prefer defining the core styling in:

`ui/src/styles.css`

Possible implementation:

* absolute positioned image;
* behind content;
* `pointer-events: none`;
* appropriate `z-index`;
* partial clipping outside the viewport;
* responsive sizing;
* optional left/right variants.

Use approximately:

`opacity: 0.15–0.22`

as the starting range.

Adjust visually if required.

The splash itself is visually strong, so it should remain subtle.

### Placement

Do NOT place a watercolor splash between every section.

Use it selectively.

For example:

* one entering from the left;
* another later entering from the right;
* subtle treatment around the testimonial area;
* occasional partial overlap between two white sections.

Alternate placement so the page does not look repetitive.

Allow some of the watercolor edge/petals to float into the surrounding white negative space.

### Mobile

On smaller screens:

* reduce scale;
* reduce opacity;
* crop more aggressively;
* or hide individual decorative instances if they interfere with content.

Absolutely prevent horizontal scrolling caused by the decoration.

The watercolor must never reduce text readability.

---

# 1. HOMEPAGE

Primary file:

`ui/src/routes/index.tsx`

Do not replace the homepage architecture.

Reorganise and refine the existing sections.

---

## 1.1 HERO

Keep the current hero implementation.

Do NOT redesign it as part of this task.

Preserve its existing:

* artwork;
* overlays;
* CTA;
* dynamic upcoming meetup behaviour;
* responsiveness;
* animation.

Only make adjustments if required to transition cleanly into the new white section layout.

---

# 1.2 CURRENT BOOK

Keep the existing **Current Book / featured read** section essentially unchanged.

The current featured book is:

**Crown Me Dead — Liv Zander**

However, do NOT hardcode this value if the application already receives the current book dynamically.

Preserve the existing dynamic data flow.

Do not redesign the Current Book component.

Minor surrounding spacing changes are acceptable if needed for the new homepage rhythm.

---

# 1.3 REVIEW YOUR LATEST READ

Locate the existing:

**Review your latest read**

section/component.

Move this section substantially higher in the homepage journey.

Member participation should become visible much earlier rather than appearing near the end of the page.

A sensible homepage flow should now prioritise:

Hero → introductory/story content → Current Book / Review interaction → community/events content → social proof.

Determine the exact placement based on the existing component structure rather than arbitrarily inserting it.

Do NOT duplicate the review section.

Move/reuse the existing implementation.

Preserve:

* existing API calls;
* authentication requirements;
* submission logic;
* toast behaviour;
* validation;
* existing functionality.

Only change its position and styling where necessary.

---

# 1.4 UPCOMING EVENTS — CALENDAR EXPERIENCE

The existing homepage already retrieves dynamic public data.

Inspect:

`publicApi.getHome`

and the existing event API implementation before making changes.

Do NOT create a second hardcoded event dataset.

Do NOT hardcode:

`Guilt and Co — 28 August 2026`

That is an example of the type of event that should appear from the actual data source.

## Replace the current homepage event-block presentation

The homepage should support **multiple upcoming events** through an actual calendar-style interface.

Create an elegant compact Wine & Chapters calendar.

This should look like part of the website, NOT like a business scheduling application.

### Calendar structure

Display:

* current month/year;
* previous/next month navigation if useful;
* weekday headings;
* proper calendar date grid;
* subtle event indicators on dates containing events.

Dates containing events should use the existing pink accent.

For example:

* small pink dot;
* soft pink date background;
* pink ring;
* subtle highlight.

Avoid oversized badges.

### Interaction

When a user selects a date containing an event:

show the associated event details elegantly below or beside the calendar.

Event information can include existing available data such as:

* title;
* date;
* time;
* venue;
* location;
* attendee count;
* event image;
* RSVP/event link.

Use only data actually available from the API.

If multiple events occur on the same date, support them correctly.

### Data

Reuse the existing backend/public event data.

If `publicApi.getHome` currently returns only a single `upcomingEvent`, inspect the existing events endpoint before changing backend behaviour.

Prefer reusing an existing events API that already returns multiple events.

Only extend the API if necessary.

Do not duplicate backend logic merely for the homepage.

### Mobile

The calendar must be properly responsive.

Do not simply shrink a desktop calendar until the text becomes unreadable.

On mobile:

* use compact date cells;
* reduce spacing;
* move selected event details underneath the calendar;
* maintain comfortable touch targets.

---

# 1.5 WHAT MEMBERS SAY

Locate the existing:

**What members say**

testimonial/review section.

Move this section to the **very bottom of the homepage content**, immediately before the global footer.

Important:

The Footer is already rendered by:

`ui/src/routes/__root.tsx`

Do NOT move, duplicate or import the Footer into `index.tsx`.

Simply ensure the testimonial section is the final homepage section rendered before the root layout's Footer.

## Visual treatment

This should become the final emotional/social-proof moment of the homepage.

Keep the central content clean and white.

Introduce restrained Wine & Chapters pink around the outer edges.

This is also a good location for the watercolor splash.

For example:

* watercolor entering from the lower left;
* subtle second pink treatment toward the opposite edge;
* testimonial content remains clean in the middle.

Do not place watercolor directly behind testimonial text.

---

# 2. TESTIMONIAL PROFILE IMAGES

The existing testimonial/review slider currently uses placeholder avatar icons in places.

Replace placeholders with the reviewer's **actual profile image when one exists**.

Before implementing this:

inspect:

* testimonial data;
* review API response;
* user/member data;
* existing uploaded/profile image fields;
* existing public assets.

Do not assume where the images live.

## Correct mapping

A testimonial must only display the profile image belonging to that reviewer.

Never randomly map available member photos to testimonials.

## Presentation

Use:

* circular or softly rounded profile image;
* consistent dimensions;
* `object-fit: cover`;
* subtle border/shadow appropriate to the current design.

Keep the image relatively small.

It should support the testimonial rather than dominate it.

## Missing image fallback

If the reviewer does not have an image:

retain/create an elegant branded fallback.

Possible fallback:

* initials;
* subtle pink avatar;
* existing user icon.

Do NOT generate fake profile photographs.

## Backend

If profile image information already exists but isn't currently returned by the testimonial/review API:

cleanly expose that field through the existing API.

Do not hardcode individual image paths in the carousel unless those testimonials themselves are static project data.

---

# 3. MEMBERSHIP → SHOP

The current application has an existing route:

`/membership`

implemented in:

`ui/src/routes/membership.tsx`

The page currently contains substantial membership content including:

* free membership messaging;
* membership card;
* benefits/features;
* joining steps;
* FAQ.

The client now wants this area to become a future **Shop**.

## Navbar

Edit:

`ui/src/components/site/navbar.tsx`

Change the visible navigation label:

`Membership`

to:

`Shop`

This applies to BOTH:

* desktop navigation;
* mobile navigation.

Because both are generated from the existing shared `links` array, change the source rather than creating separate labels.

### Route

For now, KEEP:

`/membership`

as the destination.

Do not introduce unnecessary routing changes just to rename the visible navigation item.

We can migrate to `/shop` later when actual ecommerce functionality exists.

---

# 3.1 SHOP COMING SOON PAGE

Simplify:

`ui/src/routes/membership.tsx`

Remove the existing public membership sales/explanation layout from this page.

Replace it with a minimal, elegant branded **Coming Soon** experience.

Possible structure:

Eyebrow:

`Wine & Chapters Shop`

Heading:

`Something lovely is coming.`

Supporting copy can briefly communicate that the Wine & Chapters shop is being prepared.

For example:

Books, reading favourites and a few lovely things for your next chapter.

Keep this VERY restrained.

Do not create fake products.

Do not add:

* fake pricing;
* checkout;
* carts;
* fake stock;
* ecommerce API calls;
* product grids.

The purpose is simply to signal that Shop is coming soon.

Use the existing design system.

A subtle watercolor detail may be used here if it improves the composition.

## Metadata

Update the page's metadata from Membership language to Shop language.

For example:

`Shop — Wine & Chapters`

and an appropriate Coming Soon description.

## Existing membership data

Do NOT delete:

`membershipTiers`

or other membership data from shared files merely because the public membership page no longer displays it.

Search for other usages first.

Only remove code/data that is genuinely unused after the change.

---

# 4. CONTACT PAGE

leave as is



# 5. SECTION BACKGROUNDS

The client specifically wants the content areas cleaner.

Remove unnecessary large tinted/gradient section backgrounds where doing so improves the homepage.

Use primarily:

`white / existing background`

for the main content canvas.

Do not indiscriminately delete every existing gradient class.

Review each section visually.

Keep subtle gradients where they genuinely contribute to depth.

The new hierarchy should come primarily from:

* whitespace;
* typography;
* cards;
* imagery;
* watercolor edge details;
* pink micro-accents.

Avoid alternating huge white/pink/white/pink blocks.

---

# 6. EXISTING ABOUT BOOK

The homepage currently has the custom interactive About book/page-turning experience.

Preserve it.

Do NOT replace it with a standard About section.

Do NOT remove its:

* page controls;
* video;
* story pages;
* animation;
* cover;
* responsive behaviour.

The watercolor treatment can complement the area around it but must not interfere with the book itself.

---

# 7. EXISTING ROOT ARCHITECTURE

`ui/src/routes/__root.tsx` already provides:

* Navbar
* Footer
* AuthProvider
* React Query provider
* Chat widget
* Toaster
* route Outlet

Preserve this architecture.

Do not duplicate global components inside individual pages.

In particular:

**Do not move the Footer into the homepage just to place testimonials before it.**

The homepage testimonial section simply needs to become its final section.

---

# 8. ROUTING

The project uses TanStack Router.

Preserve the existing routing structure.

Do NOT manually edit:

`ui/src/routeTree.gen.ts`

unless absolutely required by the project's normal route generation workflow.

Prefer modifying the source route files and allowing the existing tooling to regenerate route information.

For this update there should be no need to introduce new routes.

---

# 9. DATA / API SAFETY

This application already contains dynamic backend integration.

Before replacing any UI with hardcoded content, inspect the existing API.

Preserve dynamic behaviour for:

* current book;
* events;
* reviews;
* testimonials;
* member information;
* authentication;
* RSVP/event functionality.

Do not convert dynamic content back into static frontend data.

Where the new UI needs more information:

first determine whether an existing API endpoint already provides it.

Only extend backend/API behaviour when necessary.

---

# 10. RESPONSIVE DESIGN

Perform a full responsive pass after implementation.

Test approximately:

### Desktop

1440px+

### Laptop

1024–1280px

### Tablet

768px

### Mobile

375–430px

Pay particular attention to:

* homepage calendar;
* watercolor decorations;
* About book;
* testimonial carousel;
* profile images;
* Shop page;
* navigation;
* review submission;
* Current Book;
* section spacing.

---

# 11. MOBILE WATERCOLOR RULES

The watercolor decoration must not simply scale proportionally from desktop.

On mobile:

* crop it more aggressively;
* reduce opacity;
* reduce visible width;
* reposition it behind negative space;
* hide individual decorations where appropriate.

Never allow:

`overflow-x`

or accidental horizontal page scrolling.

---

# 12. ACCESSIBILITY

Preserve existing accessibility practices.

Decorative watercolor images must use:

`alt=""`

and:

`aria-hidden="true"`

where appropriate.

Ensure:

* calendar dates are keyboard accessible where interactive;
* selected dates have meaningful state;
* event information isn't communicated through color alone;
* testimonial images have sensible alt behaviour;
* existing focus states remain intact.

---

# 13. PERFORMANCE

Do not unnecessarily increase homepage weight.

For the watercolor PNG:

* use the supplied optimized transparent asset;
* do not render dozens of copies;
* lazy load where appropriate;
* avoid JavaScript animation just to move decorative imagery.

CSS positioning is preferred.

Do not introduce a large calendar library unless there is a genuine requirement that cannot reasonably be handled with the existing stack.

---

# 14. DO NOT TOUCH UNRELATED FEATURES

Do not refactor unrelated areas while completing this task.

In particular avoid unnecessary changes to:

* authentication;
* Member Hub;
* Admin dashboard;
* chat widget;
* Supabase/backend infrastructure;
* email delivery;
* password reset;
* About page;
* registration;
* login;
* event administration.

Only modify supporting code where required for the requested functionality.

---

# 15. FINAL HOMEPAGE FEEL

After implementation, the homepage should no longer feel like a sequence of isolated component blocks.

It should feel like one continuous editorial composition.

The watercolor should visually connect areas without becoming the background itself.

Think:

**white editorial page + romantic photography + soft pink watercolor appearing at the edges + generous negative space.**

NOT:

**pink website with white cards.**

The final testimonial section should provide a warm visual ending immediately before the footer.

---

# 16. VALIDATION BEFORE COMPLETION

Before finishing:

1. Run the existing frontend build/typecheck.
2. Fix any errors introduced by these changes.
3. Verify homepage loads successfully.
4. Verify dynamic Current Book still works.
5. Verify multiple events can render.
6. Verify calendar month/date calculations.
7. Verify event selection.
8. Verify testimonial profile-image fallback.
9. Verify desktop navigation says `Shop`.
10. Verify mobile navigation says `Shop`.
11. Verify `/membership` displays the new Shop Coming Soon experience.
12. Verify public contact email is `wineandbooks@gmail.com`.
13. Verify transactional email configuration was not accidentally changed.
14. Verify watercolor decorations create no horizontal overflow.
15. Verify mobile layout at ~375px.
16. Verify testimonial section is the final homepage section before the root Footer.
17. Verify no event/current-book data was unnecessarily hardcoded.

Do not stop after making the code compile. Review the resulting layout and adjust spacing, watercolor opacity, positioning and responsive behaviour so the finished page looks intentional.

## Final instruction

Make the requested changes directly and preserve all unrelated working functionality. Do not redesign the application or perform broad refactors outside the scope of this update.
