Wine & Chapters – Explore, Member Portal & Admin Improvements

You are working on the existing Wine & Chapters application.

Your task is to audit and implement the improvements below across the public website, authentication flow, member portal, admin portal, dynamic content system, emails/notifications, and general UX.

Core Rules

Before changing anything:

1. Inspect the existing project structure, components, routes, database schema, authentication implementation, APIs, admin functions, Open Library integration if present, and current styling.
2. Do not rebuild working functionality unnecessarily.
3. Reuse the existing design system, components, typography, colours, animations, database patterns and API architecture.
4. Do not introduce duplicate components or parallel implementations where an existing system can be extended.
5. Remove hard-coded content where specified below and connect it to the existing backend/database.
6. Public pages must gracefully handle missing dynamic content.
7. Everything managed by administrators must support the appropriate create, edit, update, publish/unpublish and delete operations.
8. Maintain responsive behaviour across desktop, tablet and mobile.
9. Preserve the existing Wine & Chapters visual identity: elegant, warm, feminine, bookish and community-focused.
10. Test the complete user journey after implementation.

---

1. Explore → About

Audit the Explore / About page.

Video loading behaviour

Currently a static image/poster is displayed before the video loads.

Change this behaviour.

On initial page load:

- Do NOT display a placeholder/poster image.
- Display the normal page/background behind the video area.
- Load the video unobtrusively.
- Once sufficiently loaded, slowly fade the video into view.
- The transition should feel soft and cinematic rather than suddenly appearing.
- Avoid layout shifts while the video loads.

Use an opacity transition or equivalent implementation.

Apply the same behaviour to the video on the Home page.

Both videos should therefore behave consistently:

"background → video loads → gentle fade-in"

Do not show a temporary image first.

Respect "prefers-reduced-motion" where appropriate.

---

2. Reviews

Redesign the public review/testimonial presentation so reviews are standardised.

Instead of displaying multiple reviews simultaneously, show:

one review at a time.

Behaviour:

"Review A → fade out → Review B → fade in → Review C → etc."

Requirements:

- Consistent card dimensions.
- Consistent typography.
- Long reviews should not destroy the layout.
- Smooth fade transitions.
- Automatic rotation.
- Optional manual navigation if it fits the existing UI.
- Mobile friendly.
- Pause or otherwise avoid frustrating behaviour while the user is interacting with the review.
- Respect reduced-motion preferences.

Review comments

If a review has been added/published, authenticated members should be able to comment on it.

Implement a relationship similar to:

Review
 ├── Comment
 ├── Comment
 └── Comment

Comments should store appropriate information such as:

- review reference
- member/user reference
- comment content
- created date
- updated date where appropriate

Members should only be able to perform actions allowed by the existing permissions model.

Admins must be able to moderate/remove inappropriate comments.

Do not create a separate disconnected commenting architecture if the application already has a reusable comments system.

---

3. Homepage Events

There is currently a hard-coded event on the homepage.

Remove it.

Homepage events must come entirely from the dynamic event system managed through Admin.

Expected logic:

IF an appropriate published/upcoming event exists
    display event
ELSE
    render the designed empty/blank state

Do NOT leave the old demo event as fallback content.

The homepage event should automatically change when admins:

- create an event
- edit an event
- publish/unpublish an event
- delete an event

Determine the most sensible existing logic for deciding which event appears, preferably the next published upcoming event.

---

4. Events

Audit the complete Events implementation.

Events should be fully database driven.

Ensure administrators can:

- Create event
- Edit event
- Delete event
- Publish/unpublish event
- Add/change event image
- Set title
- Set description
- Set date
- Set start/end time where supported
- Set location
- Set relevant links/details
- Manage attendance/RSVP functionality where already supported

Ensure public/member event pages consume this data rather than duplicate hard-coded event information.

Past events should not accidentally appear as the next upcoming event.

---

5. Contact / System Notifications

Audit all emails and user-facing system notifications.

Every communication sent by Wine & Chapters should visually belong to the platform.

Create/reuse a central branded notification/email template rather than independently styling each email.

This should cover at minimum:

- Newsletter
- Password reset
- Welcome email
- Member onboarding
- Email verification if used
- Event notifications
- Event reminders
- RSVP notifications
- Account notifications
- Admin-triggered communications
- Book-related notifications
- Contact-form acknowledgements if used

Use the Wine & Chapters:

- logo
- colours
- typography where email-safe
- button styling
- spacing
- footer
- friendly community-focused language

The templates must work correctly in common email clients, so do not rely on normal web CSS that email clients are likely to strip.

Where possible create a reusable structure such as:

EmailLayout
 ├── Header / Logo
 ├── Content
 ├── CTA
 └── Footer

Then inject the individual notification content.

Do not break existing delivery providers or transactional-email functionality.

---

6. Member Portal Authentication Bug

There is currently a serious authentication/navigation issue.

Current behaviour:

1. User signs in.
2. User accesses Member Portal.
3. Portal still asks the user to sign in.
4. Signing in again redirects the user to the homepage.

Investigate the actual cause rather than adding a workaround.

Audit:

- auth state/provider
- session persistence
- cookies/tokens
- protected routes
- middleware
- portal route guards
- login redirects
- post-login redirects
- client/server auth state hydration
- logout behaviour

Expected behaviour:

Unauthenticated user
        ↓
Member Portal
        ↓
Sign In
        ↓
Successful Authentication
        ↓
Member Portal

Authenticated user
        ↓
Member Portal
        ↓
Portal loads immediately

Do not redirect an authenticated member back to Home unless they intentionally navigate there.

---

7. Redesign Member Portal

The Member Portal should become one of the most engaging parts of Wine & Chapters.

Do not make it feel like a generic account dashboard.

Make it feel like a digital book-club clubhouse.

Use the application's existing visual language but introduce collaborative/member-driven sections.

Suggested portal structure:

Current Read

Display the currently selected Wine & Chapters book dynamically.

Show useful information such as:

- Cover
- Title
- Author
- Description
- Reading progress/context where supported
- Rating
- Discussion/review links

Discover Books

Investigate the existing Open Library integration.

If Open Library is already configured, extend it rather than creating another structured book provider.

If it is not configured, implement it cleanly through the appropriate backend/service layer rather than exposing secrets unnecessarily.

Potential sections:

- Popular books
- Trending/relevant books
- Search books
- Recently discovered
- Similar books
- Book details

Do not falsely label structured metadata results as "trending". Use live web research for genuinely current discovery and label results accurately.

Suggestion Box

Members can suggest a future Wine & Chapters read.

Example:

Search book
   ↓
Select book
   ↓
Add suggestion
   ↓
Community can see suggestion

Prevent obvious duplicate suggestions for the same edition/book where practical.

Book Voting

Create a community voting area.

Admins should be able to select candidate books from member suggestions or manually add candidates.

Members can vote according to the configured poll rules.

Display:

- Book cover
- Title
- Author
- Vote action
- Poll status
- Closing date if configured

Do not expose voting results before poll closure if the admin has configured results to remain hidden.

Community Activity

Where the existing data supports it, create a lightweight community feed such as:

Sarah suggested a new book
Amy reviewed this month's read
Nicole joined Saturday's event
A new book vote is open

Respect privacy and only surface actions intended to be visible to other members.

Upcoming Events

Show dynamic upcoming events relevant to members.

Reviews & Discussion

Surface recent reviews and conversations.

Member Experience

The portal should feel collaborative rather than administrative.

Think:

book club + cosy digital clubhouse + community discovery

rather than:

SaaS dashboard

---

8. Dynamic "This Month's Read"

The current This Month's Read content is hard-coded.

Remove the hard-coded book completely.

The current book must be controlled through Admin.

There will normally always be a current book, but the frontend must still fail gracefully if the database temporarily contains none.

Expected architecture:

Admin selects Current Read
           ↓
Database
           ↓
Current Read service/API
           ↓
Homepage
Member Portal
Explore areas
Reviews/discussion
Other relevant components

There should be one source of truth.

Do not maintain separate homepage/member/admin versions of the current book.

Where appropriate, store the Open Library key/ISBN and required cached metadata so the site does not become unusable if an external book API is temporarily unavailable.

---

9. Admin Portal

Perform a broader audit of the Admin Portal.

Anything displayed publicly that is intended to be managed by Wine & Chapters must have the appropriate admin management functionality.

At minimum audit:

- Current Read
- Books
- Reviews
- Review comments/moderation
- Events
- Event images
- Members
- Suggestions
- Voting polls
- Newsletter/content
- Relevant homepage content

Do not add destructive actions without appropriate confirmation.

Event image placement

The Add Event Image control is currently positioned incorrectly.

Move the event image upload/selection into the Event Details area where the administrator creates or edits the event.

The event editing experience should logically group:

Event Details
├── Event Image
├── Title
├── Description
├── Date
├── Time
├── Location
├── Other Details
└── Publish Settings

The image should support:

- add
- preview
- replace
- remove

Ensure editing an existing event correctly loads the existing image.

---

10. Favicon

Use:

wine-chapters-logo.png

as the application favicon.

Check the project's framework and implement it using the correct favicon/metadata mechanism rather than simply adding an unused file.

Ensure it works across relevant public, member and admin routes.

---

11. Data & API Architecture

While implementing these changes, remove duplicated sources of truth.

The desired relationship should roughly become:

                        ADMIN
                          │
             ┌────────────┼────────────┐
             ↓            ↓            ↓
           Books        Events       Reviews
             │            │            │
             ↓            ↓            ↓
        Current Read   Upcoming     Discussions
             │          Events          │
             └──────┬─────┴─────────────┘
                    ↓
               MEMBER PORTAL
                    │
        ┌───────────┼────────────┐
        ↓           ↓            ↓
   Suggestions    Voting      Community

Use the project's existing backend/database patterns.

Do not create unnecessary APIs when equivalent endpoints already exist.

---

12. Database Changes

Inspect the current schema before creating migrations.

Only add tables/columns where necessary.

Potential concepts that may be required include:

books
current_read
events
reviews
review_comments
book_suggestions
book_polls
book_poll_options
book_votes

These names are conceptual only.

Do not blindly create these tables if equivalent models already exist.

Extend the existing schema wherever practical.

Ensure:

- foreign keys
- appropriate indexes
- timestamps
- cascading/restrictive deletes where sensible
- uniqueness constraints
- user ownership
- admin permissions
- row-level security if the project uses Supabase/RLS

are correctly implemented.

---

13. UX Requirements

Keep the experience:

- warm
- elegant
- soft
- playful
- book-focused
- community-focused
- visually consistent with Wine & Chapters

Use tasteful transitions rather than excessive animation.

Provide proper states for:

- Loading
- Empty
- Error
- Success
- Disabled
- Authentication required

Avoid generic browser alerts where the application already has styled toast/modal components.

14. Gallery

Remove the current gallery on landing page for now

---

15. Final Audit & Testing

After implementation, test the application as three different states:

Visitor

Test:

Home → Explore → About → Reviews → Events → Contact → Membership → Sign In

Member

Test:

Sign In → Member Portal → Current Read → Discover → Suggest Book → Vote → Review → Comment → Events → Sign Out → Sign In again

Verify that authentication survives navigation and refreshes correctly.

Administrator

Test:

Admin → Add Current Read → Edit Current Read → Create Event → Upload Event Image → Edit Event → Publish → Confirm Homepage → Create Poll → Manage Suggestions → Moderate Reviews/comments → Remove Event

Verify that frontend changes automatically reflect admin-managed data.

Also specifically search the codebase for remnants of the old:

- hard-coded homepage event
- hard-coded current read
- poster/placeholder images for the two specified videos

and remove them if they are no longer required.

---

Definition of Done

The task is complete when:

- Home and About videos fade in without displaying an image first.
- Reviews display one at a time with smooth transitions.
- Published reviews support member comments.
- Homepage events are completely dynamic.
- No fake/default event appears when there are no events.
- Current Read is completely dynamic and admin managed.
- All relevant Wine & Chapters emails/notifications are branded.
- Member Portal authentication works correctly.
- Successful member login returns the user to the Member Portal when that was their destination.
- Member Portal has been transformed into a collaborative book-club experience.
- Book discovery/suggestions/voting are functional and persistent.
- Admin can manage all applicable dynamic content.
- Event image management is correctly located inside Event Details.
- "wine-chapters-logo.png" is the favicon.
- Existing working functionality has not regressed.
- Desktop and mobile layouts have been tested.
- No specified hard-coded demo content remains.

When finished, provide a concise implementation report containing:

1. Files/components changed.
2. Database migrations/schema changes.
3. APIs/endpoints added or modified.
4. Authentication bug cause and fix.
5. Hard-coded content removed.
6. New member portal features.
7. Admin functionality added/changed.
8. Any environment variables/configuration I need to add.
9. Any remaining limitations or recommended follow-up work.
