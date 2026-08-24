Wine & Chapters — Books AI Tool Layer

Objective

Implement a lightweight tool/action layer for the existing Books AI widget.

This is a free project, so do not over-engineer it. Reuse the existing architecture, components, APIs, Supabase integration and AI implementation wherever possible.

The backend must ultimately be compatible with the project's existing Supabase deployment.

Before changing anything, inspect the repository and understand:

- Current Books AI widget and LLM provider/integration
- Existing Supabase setup
- Existing API/backend structure
- Current Reads implementation
- Events
- Reviews
- Polls/voting
- Member/auth data
- Existing Open Library book integration
- Existing notification/toast components
- Existing animations/components that can be reused

Do not replace working functionality.

---

Architecture

Prefer a small internal tool registry over introducing a separate MCP service.

Structure it so these handlers could later be exposed through MCP if required.

Target flow:

Books AI
   ↓
LLM tool call
   ↓
Backend tool registry
   ├── Supabase / existing application data
   ├── Book API
   └── UI action response
             ↓
       Books widget
             ↓
       AIActionHandler
             ↓
       Existing React UI

The LLM must NEVER receive permission to execute arbitrary JavaScript, CSS, DOM selectors, SQL or Supabase queries.

Everything must use predefined, validated actions.

---

Phase 1 — Club Context

Implement:

get_club_context()

Return useful existing site information such as:

- Current read
- Previous reads where available
- Upcoming events
- Active poll/voting information
- Announcements if implemented
- Reviews/rating summary where useful
- Logged-in member state where appropriate

Use existing Supabase tables/services.

Do not duplicate data.

The purpose is to allow Books to understand what is happening in the club.

Example:

User:

«When are we meeting again?»

Books should know from "get_club_context()" rather than hallucinating an answer.

---

Phase 2 — Book Search

Implement:

search_books({
  query
})

Use the project's existing book provider if one already exists.

Reuse the existing Open Library provider.

Return only useful structured information:

{
  "id": "...",
  "title": "...",
  "authors": [],
  "cover": "...",
  "description": "...",
  "publishedDate": "...",
  "categories": []
}

Do not expose unnecessary upstream API data to the model.

---

Phase 3 — Browser/UI Actions

Create a central frontend:

AIActionHandler

It receives validated actions returned by AI tool calls.

Supported actions:

NAVIGATE
SHOW_BOOK
SHOW_AUDIO
OPEN_WIDGET
SET_MOOD
SHOW_TOAST
TRIGGER_EFFECT

Use a strict TypeScript discriminated union/schema.

Never execute arbitrary values from the LLM.

---

navigate()

Tool:

navigate({
  destination
})

Destinations MUST come from a whitelist based on actual routes/sections discovered in the repository.

Examples might include:

home
current-read
events
reviews
membership
poll
contact

Do not assume these names — inspect the app.

Where appropriate:

1. Navigate or smooth-scroll.
2. Focus the relevant component.
3. Apply a subtle temporary highlight.
4. Remove the highlight automatically.

Example:

«Where do I RSVP?»

Books:

«Come, I'll show you.»

Then navigate to the appropriate event/RSVP interface.

---

Phase 4 — Show Book

Implement:

show_book({
  bookId
})

Instead of dumping large amounts of book information into chat, allow Books to trigger a small attractive floating book card.

Reuse the site's visual language.

It can contain:

- Cover
- Title
- Author
- Short description
- Relevant existing club action

Keep it lightweight and mobile-friendly.

---

Phase 5 — Audio Experience

Implement:

find_audio({
  title,
  author
})

and a UI action:

SHOW_AUDIO

The goal is an interaction such as:

«Keen to listen to an audiobook while you browse?»

If the user accepts, Books can locate an appropriate Spotify/audio destination and trigger a small bottom-right audio/player experience.

Do not attempt to bypass browser autoplay restrictions.

Playback/opening must occur through legitimate user interaction where required.

The mini-player must:

- Be unobtrusive
- Collapse/minimise
- Close completely
- Work on mobile
- Never cover important navigation or CTAs

If Spotify cannot provide actual playable audiobook content through the available integration, gracefully provide the appropriate Spotify destination rather than pretending playback is available.

---

Phase 6 — Mood System

Implement:

set_mood({
  mood
})

Start with a small whitelist:

default
cosy
romance
mystery
fantasy
night

Do NOT rebuild the site's theme.

Implement moods primarily through existing CSS variables/classes and subtle effects.

Examples:

- Background tint
- Glow
- Overlay
- Slight lighting changes
- Very subtle animation

Books could respond to:

«Make things cosy.»

and trigger:

SET_MOOD: cosy

There must always be a clean way back to "default".

Respect "prefers-reduced-motion".

---

Phase 7 — Existing Widgets

Implement:

open_widget({
  widget
})

Only expose widgets/components that already exist or are trivial to expose.

Potential examples:

event
poll
current_read
reviews
suggest_book

Inspect the repository before defining the final whitelist.

Do NOT rebuild existing components for the AI.

The AI should invoke the same interfaces the user would normally use.

---

Phase 8 — Toasts

Implement:

show_toast({
  message,
  type
})

Reuse the existing themed notification system.

Whitelist types.

For example:

info
success
book

Put sensible length limits on "message".

Books can therefore communicate outside the chat bubble occasionally.

Do not allow spam or repeated toast calls.

---

Phase 9 — Visual Effects

Implement one generic tool:

trigger_effect({
  effect
})

Initial whitelist:

book_reveal
page_flutter
wine_cheers
sparkle
celebration

These should be lightweight frontend effects.

Do NOT introduce a heavy animation framework unless the project already uses one.

Use existing libraries first.

Effects must:

- Clean themselves up
- Not block navigation
- Be responsive
- Respect reduced-motion
- Have sensible cooldowns

The LLM must not provide animation code.

It only chooses a predefined effect.

---

Phase 10 — Surprise Me

Implement:

surprise_me()

Keep this simple.

Possible experiences:

Blind Date With a Book

Select an appropriate book and initially reveal only intriguing characteristics.

Example:

«A morally questionable woman.

One spectacularly bad decision.

And approximately two hours of sleep you're not getting tonight.»

Allow the visitor to reveal the book.

Random Recommendation

Use current/previous reads plus book search to avoid obviously repetitive recommendations.

Mood Experience

Books may select an appropriate predefined mood + book recommendation.

Do not build a complicated recommendation engine.

---

Proactive Books

Add a VERY lightweight frontend mechanism allowing Books to occasionally initiate an interaction.

Do not continuously call the LLM.

Use frontend/session signals such as:

time on page
current section
number of interactions
whether Books has already spoken
logged-in state

Example strategy:

Visitor remains on Current Read >30 seconds
        ↓
small random probability
        ↓
Books has not proactively spoken recently
        ↓
request one contextual interaction

Examples:

«Keen to listen to an audiobook while you browse?»

«You've been staring at that book for a while. Want the quick version?»

«Feeling adventurous? I'll pick your next book.»

«Want a blind date with a book?»

These interactions must feel occasional and surprising.

Important

Implement:

- Session cooldown
- Maximum proactive interactions
- Dismissal state

If someone dismisses Books, leave them alone.

Do not make Books behave like Clippy.

---

Security

All tool inputs must be schema validated.

Use existing authentication.

For anything involving member-specific information:

authenticated user
→ backend
→ authorised Supabase query

Never trust a user ID supplied by the LLM/browser.

Derive identity from the authenticated session.

Never expose:

- Supabase service role keys
- AI API keys
- Private member data
- Raw SQL
- Arbitrary database access

UI tools must operate exclusively through whitelisted actions.

---

LLM Instructions

Update Books' system instructions so it understands that it is part of the Wine & Chapters website.

Personality should be:

- Warm
- Playful
- Book obsessed
- Occasionally cheeky
- Concise
- Helpful without behaving like customer support software

It should understand that tools can alter the user's website experience.

Encourage natural behaviour such as:

«Come, I'll show you.»

"navigate(...)"

rather than:

«Please navigate to the Events section using the navigation menu.»

Do not announce tool names or technical actions.

Books should use visual actions where they improve the experience instead of describing everything in text.

However, effects/moods/toasts should be used sparingly.

---

Supabase Deployment

The backend/tool implementation MUST remain compatible with the existing Supabase architecture.

Inspect the project first to determine whether backend AI functionality currently runs through:

- Supabase Edge Functions
- Existing server/API endpoints
- Another existing backend mechanism

Follow the established pattern.

If these tools belong in Supabase Edge Functions, organise them cleanly rather than creating one function per tiny UI action.

Prefer something conceptually similar to:

supabase/functions/books-ai/
    index.ts
    tools/
        club-context.ts
        books.ts
        audio.ts
        ui-actions.ts

where appropriate for the actual repository.

Frontend-only actions such as:

NAVIGATE
SET_MOOD
SHOW_TOAST
TRIGGER_EFFECT

must remain frontend actions.

Supabase/Edge Functions should validate and return the action — not attempt to control the browser.

Ensure required environment variables/secrets are documented for Supabase deployment.

Do NOT commit secrets.

---

Cost Control

This project must stay lightweight.

Do not add:

- Vector databases
- Complex RAG pipelines
- Background workers
- Agent orchestration frameworks
- Separate microservices
- Redis
- Queues
- Unnecessary database tables
- A separate MCP server unless genuinely required by the existing architecture

Prefer existing infrastructure.

We want high perceived magic for very little infrastructure.

---

Testing

Verify at minimum:

1. Books can retrieve current club information.
2. Books can navigate to a real section.
3. Book search works.
4. Book preview can be opened.
5. Mood can change and reset.
6. Toasts work.
7. Effects work and clean themselves up.
8. Proactive interaction cooldown works.
9. Dismissing proactive Books stops further interruptions.
10. Invalid tool/action values are rejected.
11. Mobile layout works.
12. Reduced-motion is respected.
13. No secrets reach the browser.
14. Existing site functionality remains intact.

---

Deployment

Once implementation and local testing are complete:

1. Run the project's existing lint/typecheck/tests/build.
2. Fix only issues related to this implementation unless an existing issue blocks deployment.
3. Review the diff.
4. Confirm no secrets or local configuration have been committed.
5. Deploy/push the required backend changes to the project's existing Supabase backend using the project's established deployment process.
6. Verify the deployed function/backend responds successfully.
7. Do not modify unrelated Supabase resources or production data.

At completion, report:

- Files changed
- Tools implemented
- UI actions implemented
- Supabase functions/backend changes
- Required secrets/environment variables
- Deployment performed
- Verification results
- Anything intentionally deferred

Guiding Principle

Do not build Lancee.

Build a small, charming layer that makes Books feel like it actually lives inside Wine & Chapters.

The success metric is not the number of AI tools.

It is moments like:

«“Keen to listen while you browse?”»

Yes.

And a tiny player quietly appears in the corner.
