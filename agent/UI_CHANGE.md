# Agent — Wine & Chapters Final Homepage & Events UI Pass

Work against the CURRENT Wine & Chapters repository state.

This is a focused UI/information-architecture correction following the recent homepage redesign.

**Do not redesign the site again.**

The current visual direction is good. The objective is to:

1. create clearer visual separation between homepage sections;
2. remove full book-review functionality from Home;
3. introduce small Review + Gallery discovery links between About and Current Read;
4. restore the original Wine & Chapters member testimonials as a proper homepage carousel;
5. move the real interactive event calendar from Home to `/events`;
6. simplify the homepage event presentation;
7. preserve all existing dynamic data, registration, AI, RSVP and review functionality.

Before editing, inspect the current code and available assets/data.

---

# 1. HOMEPAGE VISUAL SEPARATION

Current primary file:

`ui/src/routes/index.tsx`

The current homepage looks good individually, but while scrolling the sections visually blend into one long cream/white page.

The watercolor decorations alone are not providing enough section separation.

Do NOT introduce hard horizontal dividers everywhere.

Instead establish a deliberate editorial background rhythm.

Think:

**chapter → chapter → chapter**

rather than:

**section → section → section on one continuous canvas**

## Background rhythm

Use subtle variations from the EXISTING Wine & Chapters palette.

Possible rhythm:

Hero
→ warm white / About
→ subtle discovery strip
→ cool pale grey-blue / Current Read
→ warm white / Why Join
→ subtle blush/neutral / Community
→ warm white / Upcoming Event teaser
→ contained blush Join CTA
→ soft neutral Newsletter
→ warm white / Member Testimonials
→ Footer

This is directional, not a requirement to introduce new colors.

Reuse existing CSS variables/palette.

Do not alternate aggressively between pink and white.

The differences should be subtle but immediately perceptible while scrolling.

## Techniques

Use combinations of:

* full-width subtle background changes;
* generous vertical whitespace;
* contained editorial canvases;
* occasional soft borders;
* controlled overlaps;
* watercolor transition artwork;
* different content widths/compositions.

Do NOT turn every section into a card.

The existing Current Read section demonstrates the desired principle well: its pale blue-grey treatment immediately communicates that the visitor has entered another chapter.

---

# 2. WATERCOLOR

Keep the existing `WatercolorSplash` system/component.

Use watercolor as transition artwork rather than the primary separator.

Reduce opacity slightly where necessary.

Avoid identical splash placement repeatedly.

Allow selected splashes to partially cross boundaries between sections.

Do not use watercolor on every section.

Ensure:

* `pointer-events: none`;
* decorative semantics;
* no horizontal overflow;
* reduced size/opacity on mobile;
* no interference with text.

---

# 3. REMOVE FULL BOOK REVIEW FUNCTIONALITY FROM HOME

The current homepage imports:

`ReviewLatestRead`

and:

`ReviewShowcase`

from:

`ui/src/routes/reviews.tsx`

This needs correcting.

The `/reviews` page is the dedicated **book review experience**.

## Keep on `/reviews`

Preserve:

* `ReviewLatestRead`;
* book-review submission form;
* `ReviewShowcase`;
* published book reviews;
* review comments;
* ratings;
* member avatars;
* authentication;
* all existing book-review functionality.

Do NOT duplicate these features on Home.

Remove the full `ReviewLatestRead` implementation from the homepage.

Remove the book-review `ReviewShowcase` from the homepage if it is currently being used as the homepage "What Members Say" implementation.

The homepage member testimonials described later are NOT book reviews.

---

# 4. NEW DISCOVERY STRIP BETWEEN ABOUT AND CURRENT READ

There is currently a visual repetition:

**About book visual → Current Read book cover**

Two large book-oriented visuals appear directly after one another.

Insert a lightweight discovery section BETWEEN:

`About`

and:

`This Month's Read`

This should deliberately break up the two book visuals.

## Purpose

Expose two deeper areas of the website without copying their functionality onto Home:

### Review your latest read

Small editorial CTA.

Possible content:

Eyebrow:

`JUST FINISHED A BOOK?`

Heading:

`Tell us what you thought.`

Short copy:

`Loved it, hated it, couldn't put it down? We want to hear it.`

CTA:

`REVIEW YOUR LATEST READ`

Destination:

`/reviews`

If useful, use an anchor/search state to take the visitor directly to the review form, but do not introduce brittle navigation.

### Gallery

Small gallery discovery CTA.

Possible content:

Eyebrow:

`FROM OUR CAMERA ROLL`

Heading:

`A few chapters worth remembering.`

CTA:

`VIEW THE GALLERY`

Use the EXISTING Gallery route if one exists.

Inspect the repository and use the actual route rather than guessing.

## Design

Desktop:

Prefer a compact two-column editorial strip.

For example:

`Review latest read | Gallery`

Each side should contain:

* small icon/image treatment;
* short heading;
* maximum 1–2 lines of copy;
* small CTA.

The Gallery side may use one or a small overlapping pair of EXISTING gallery/event images if appropriate.

Do not render an actual gallery grid.

Do not render the review form.

Mobile:

Stack the two discovery items vertically.

Keep this section visually lighter than Current Read, Community and Events.

Its main purpose is:

**break the book → book repetition + expose deeper site features.**

---

# 5. CURRENT READ

Keep the existing dynamic Current Read implementation.

Do not hardcode the current title.

Do not redesign this section.

Keep its pale grey-blue visual identity because it currently provides strong section separation.

Minor spacing refinements are acceptable.

---

# 6. HOMEPAGE MEMBER TESTIMONIALS — IMPORTANT

Restore the original Wine & Chapters **club testimonials** to the homepage.

These are NOT:

* book reviews;
* `PublishedReview`;
* `ReviewShowcase`;
* review comments;
* ratings.

They are testimonials from approximately three real people about their experience with **Wine & Chapters itself**.

There was previously code/data containing these three testimonials.

## First: recover existing content

Search:

* current source;
* existing data files;
* assets;
* previous implementation/history where accessible;
* member/profile assets;

for the original three people.

Recover/reuse their:

* names;
* testimonial text;
* existing photographs/profile images.

Do NOT invent testimonial quotes.

Do NOT substitute published book reviews.

Do NOT assign random member photographs.

If an original image genuinely cannot be found, use a tasteful initials/avatar fallback rather than fabricating a person.

## Homepage placement

The member testimonial section should remain:

**immediately before the global footer**

as the final substantial homepage social-proof section.

Replace the current simplistic:

`What members say`

single quote treatment with a proper carousel.

## Carousel design

Create an elegant horizontal testimonial carousel.

Show ONE primary testimonial at a time.

Each slide should contain:

* person's real image;
* their testimonial;
* their name.

Potential editorial composition:

`portrait | large quotation | name`

rather than a generic SaaS testimonial card.

Transitions should move **sideways/horizontally**.

The next testimonial should visibly feel like another slide entering rather than text simply fading.

Provide:

* previous control;
* next control;
* subtle pagination dots or progress indicator.

Optional auto-advance is acceptable.

If auto-advance is used:

* approximately 6–9 seconds;
* pause on hover/focus;
* pause during interaction;
* respect `prefers-reduced-motion`.

Mobile should support swipe/touch interaction if practical with the existing stack.

Do not add a heavy carousel dependency unless necessary.

Use existing motion capabilities where appropriate.

## Visual treatment

Keep the testimonial center clean and readable.

Use restrained watercolor/pink treatment around the OUTER edges.

This should feel like the emotional closing chapter of the homepage.

---

# 7. EVENTS — MOVE INTERACTIVE CALENDAR OFF HOME

The current homepage contains the proper calendar implementation using the existing Calendar component.

The `/events` route currently has:

`List | Calendar`

tabs.

However, its existing `Calendar` tab is effectively another event list rather than an actual month calendar.

Correct this.

## Homepage

REMOVE the full interactive month calendar from Home.

Home should introduce upcoming events, not become the event management page.

Replace it with a compact **Upcoming Event teaser** using the next upcoming dynamic event.

Reuse existing event data/API.

Possible composition:

Left:

* eyebrow `UPCOMING EVENT`
* title such as `Gather, sip & celebrate stories.`
* short copy
* `VIEW ALL EVENTS`

Right:

* next event image;
* date;
* title;
* time;
* venue;
* small RSVP/details CTA if appropriate.

Do not hardcode an event.

Use the actual next upcoming event.

If there are no published upcoming events, provide an elegant empty state rather than showing fake content.

Primary CTA should navigate to:

`/events`

Do NOT render another calendar on Home.

---

# 8. EVENTS PAGE — REAL INTERACTIVE CALENDAR

Primary file:

`ui/src/routes/events.tsx`

Reuse/adapt the working calendar logic currently implemented on Home.

Do not maintain two separate calendar implementations.

Extract a reusable event-calendar component if that creates a cleaner implementation.

## Existing events functionality

Preserve:

* dynamic `publicApi.getEvents`;
* authenticated `memberApi.getEvents`;
* RSVP;
* attendee counts;
* capacity;
* remaining seats;
* contribution functionality;
* Paystack contribution card;
* authentication-aware behaviour.

Do not break `MemberEventCard`.

## List / Calendar views

The existing:

`List | Calendar`

toggle can remain.

### List

Keep the existing event-card/list experience.

### Calendar

Replace the current fake calendar list with the real interactive calendar.

The calendar must:

* show a proper month grid;
* display month/year;
* support previous month;
* support next month;
* mark dates containing events;
* indicate selected date;
* allow date selection;
* support multiple events on one date;
* show event information for the selected date;
* derive everything from existing event data.

Event dates should use restrained Wine & Chapters pink indicators.

Do not communicate event presence solely through color.

## Selected event details

When an event date is selected, display the relevant event card/details adjacent to or underneath the calendar.

Use available data such as:

* cover image;
* title;
* date;
* time;
* theme;
* venue;
* description;
* remaining seats;
* attending count;
* contribution amount where appropriate;
* RSVP state/action.

Reuse `MemberEventCard` or extract appropriate shared presentation rather than duplicating RSVP logic.

If multiple events occur on the same date, allow the visitor to view/select each.

## Initial month

When events exist, initialize intelligently around the nearest upcoming relevant event rather than forcing the user to navigate through irrelevant months.

If there are no events, default to the current month.

---

# 9. HOMEPAGE COMMUNITY SECTION

Keep the existing Community / "Real readers. Real connections." composition.

Do not redesign it.

Give the overall section a sufficiently distinct background/canvas so it doesn't visually merge into adjacent sections.

---

# 10. WHY JOIN

Keep the existing Why Join content and functionality.

Use its background/spacing to create a distinct chapter.

Do not make it another strong pink section.

---

# 11. JOIN CTA

Keep the existing:

`Your next favourite book is already on our shelf`

contained pink CTA.

Give it enough white/neutral breathing room above and below.

Do not surround it with another large pink background because the CTA itself already provides sufficient emphasis.

All Join membership CTAs must continue to use the actual registration flow.

---

# 12. REGISTRATION VS SHOP

Do NOT confuse Shop with membership registration.

Final intended flow:

`Join the club → /register`

`Become a member → /register`

`Member Login → existing login/member flow`

`Shop → /shop`

Shop remains the Coming Soon experience from the previous implementation.

Do not route registration CTAs to Shop.

Do not remove or modify membership registration functionality.

---

# 13. NEWSLETTER

Keep the newsletter compact.

It should function as a transitional utility section near the bottom rather than another major visual chapter.

Give it enough separation from both the Join CTA and testimonials.

---

# 14. HOMEPAGE FINAL ORDER

Use the existing component architecture, but the intended information hierarchy should now approximately be:

1. Hero
2. About / Our Story book
3. **Review + Gallery discovery strip**
4. This Month's Read
5. Why Join Us
6. Community
7. **Upcoming Event teaser — NO calendar**
8. Join CTA
9. Newsletter
10. **Wine & Chapters Member Testimonials carousel**
11. Global Footer

Do not duplicate the root Footer inside Home.

---

# 15. RESPONSIVE BEHAVIOUR

Perform a proper mobile pass.

## Discovery strip

Desktop:
two columns.

Mobile:
stacked.

## Event teaser

Desktop:
editorial text + event visual/details.

Mobile:
stack cleanly.

## Events calendar

On mobile:

* compact but readable month grid;
* appropriate touch targets;
* selected event information underneath;
* no horizontal page overflow.

Do not force a desktop-width calendar into a mobile viewport.

## Testimonials

Mobile:

* portrait remains appropriately sized;
* testimonial remains readable;
* controls remain touch-friendly;
* horizontal transition still feels intentional.

Watercolor should be reduced/cropped where necessary.

---

# 16. DO NOT BREAK AI

Books AI has just been repaired and is outside the scope of this UI task.

Do NOT refactor:

* `ai-chat`;
* Gemini configuration;
* AI tool registry;
* AIActionHandler;
* Books widget;
* Supabase AI secrets.

Only touch AI-related UI if absolutely required by an unrelated layout collision.

---

# 17. CONTACT EMAIL

The correct public email remains:

`hello@wineandchapters.co.za`

Do NOT change it.

---

# 18. DATA SAFETY

Do not hardcode dynamic:

* current book;
* upcoming events;
* event calendar;
* published book reviews;
* member state;
* RSVP state.

Reuse existing APIs.

The club testimonials are separate static/editorial content if that is how the original implementation stored them.

Restore the original implementation/data rather than turning them into book reviews.

---

# 19. VALIDATION

After implementation verify:

1. Homepage sections have clearly perceptible visual boundaries.
2. Watercolor remains subtle.
3. About and Current Read no longer appear directly one after another.
4. Review/Gallery discovery strip appears between them.
5. Clicking Review leads to the dedicated book-review experience.
6. Gallery remains its own page/experience.
7. No full book-review form exists on Home.
8. No published-book-review carousel is being misused as homepage testimonials.
9. Original Wine & Chapters member testimonials are restored where recoverable.
10. Testimonials display image + testimonial + name.
11. Testimonial carousel moves horizontally.
12. Testimonials are the final substantial homepage section before Footer.
13. Home no longer contains an interactive calendar.
14. Home shows only the next dynamic event teaser.
15. `/events` List view still works.
16. `/events` Calendar is now a real interactive month calendar.
17. Dates containing events are marked.
18. Selecting an event date displays its event(s).
19. Multiple events per date work.
20. RSVP still works.
21. Contribution/Paystack functionality remains intact.
22. `/register` still handles joining.
23. `/shop` remains separate.
24. `hello@wineandchapters.co.za` remains unchanged.
25. Books AI still works.
26. Desktop/tablet/mobile layouts work.
27. No horizontal overflow.
28. Existing build/typecheck passes.

Do not stop at compilation.

Review the actual resulting homepage flow visually and adjust section spacing/background contrast so the page genuinely reads as distinct editorial chapters rather than one continuous cream canvas.

Do not perform broad unrelated refactors.
