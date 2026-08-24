Implement Phase 1 of Books persistent conversation memory.

Read `BOOKS_MEMORY_DIAGNOSIS.md` first and treat it as the evidence base.

Complete only this phase, then stop. Do not implement the conversation-history drawer, rolling summaries, embeddings, cross-conversation personal memory or unrelated UI changes.

GOAL

Give each signed-in approved member a persistent Books conversation that:

- Uses a stable UUID.
- Remembers previous messages.
- Survives refresh, navigation and reopening the site.
- Keeps different members’ conversations isolated.
- Uses server-loaded history as the authoritative model context.
- Preserves the existing Books widget appearance and tools.

1. VERIFY THE IDENTITY MODEL

Before creating the migration:

- Inspect the existing auth, users and members schema.
- Determine how `auth.uid()` maps to the application member record.
- Determine whether ownership should reference `auth.users.id`, an application user ID or a member ID.
- Follow the repository’s established foreign-key and RLS conventions.
- Do not assume that `member.id`, application user ID and `auth.uid()` are interchangeable.
- Document the selected ownership relationship in the migration and completion report.

2. DATABASE MIGRATION

Create repository-consistent tables equivalent to:

`ai_conversations`
- UUID primary key
- Owner/member relationship using the verified identity model
- Optional title
- Created timestamp
- Updated timestamp
- Last-message timestamp
- Optional archived/deleted timestamp only if consistent with existing patterns

`ai_messages`
- UUID primary key
- Conversation UUID foreign key
- Role constrained to supported roles
- Message content
- Message status if required for failure handling
- Optional structured metadata suitable for compact tool evidence
- Created timestamp
- Deterministic ordering field if timestamps alone are insufficient

Requirements:

- Add appropriate foreign keys, constraints and indexes.
- Prevent orphaned messages.
- Prevent clients from changing conversation ownership.
- Enable RLS.
- Add owner-only policies for selecting, creating and updating conversations.
- Add owner-only policies for selecting and creating messages through their owned conversation.
- Follow existing admin/service conventions where applicable.
- Do not allow members to read another member’s conversations.
- Product or site administrators should not automatically receive access to private chat transcripts unless an existing explicit policy requires it.
- Do not store secrets or unnecessary sensitive request data.

3. EDGE FUNCTION MEMORY

Update the existing Supabase `ai-chat` Edge Function:

- Require a stable `conversationId`.
- If the first request has no conversation ID, safely create a conversation for the authenticated approved member and return its UUID.
- If a conversation ID is supplied, verify ownership before reading or writing.
- Because the function uses a service-role client, explicitly include the authenticated owner/member predicate in every conversation query. Do not rely on RLS to protect service-role queries.
- Load persisted messages for the selected conversation.
- Order messages deterministically in ascending conversational order.
- Use database history as the source of truth.
- Stop accepting client-supplied `history` as authoritative context.
- Temporarily retain backward compatibility only if required to prevent the deployed frontend and function from breaking during rollout, but never persist or trust caller history as another conversation’s history.
- Persist the current user message before calling Gemini.
- Add it to the model context exactly once.
- Persist the assistant reply after successful inference.
- Return the assistant reply, conversation ID and persisted message IDs.
- Preserve the current system prompt, authentication, trusted-origin checks, Books tools and tool-call loop.

Failure behaviour:

- Define an explicit state for a persisted user message whose inference fails.
- A retry must not silently duplicate the same user message.
- Prefer accepting or generating a request/message UUID so repeated submissions can be handled idempotently.
- Do not persist a fake assistant reply when the provider fails.
- Return a safe error response without leaking provider details or secrets.

Context for this phase:

- Use a sensible bounded set of recent persisted messages.
- Remove the current lossy per-message 1,000-character clipping where safe.
- Do not implement rolling summaries yet.
- Do not use embeddings or vector search.
- Do not discard legitimate adjacent same-role messages with generic deduplication.
- Preserve valid chronological meaning.
- Avoid exceeding the model’s practical request limits by using a documented temporary recent-history bound.

Tool continuity:

- Preserve the existing in-request Gemini function-call/function-response sequence.
- For future turns, store only repository-appropriate compact tool evidence or metadata if needed.
- Do not create a provider-specific replay system in this phase.
- Ensure subsequent Books replies retain enough textual context to understand the previous result.

4. FRONTEND INTEGRATION

Update the Books widget and API client:

- Generate or obtain a conversation UUID on the first authenticated message.
- Store the active conversation ID safely for the signed-in member.
- Do not treat local numeric render IDs as conversation IDs.
- Send `conversationId` and a stable request/message UUID to `ai-chat`.
- Stop sending the local `history.slice(-8)` as authoritative history.
- Use persisted database message UUIDs as React keys where available.
- On widget mount or authenticated-session restoration, reopen the member’s current/recent conversation.
- Load and display its persisted transcript.
- Preserve the existing greeting behaviour without persisting duplicate greetings.
- Keep optimistic UI only as a display mechanism.
- Reconcile optimistic messages with the IDs returned by the backend.
- Prevent duplicate submissions while a request is active.
- Preserve the conversation through widget close/reopen, navigation and full refresh.
- Clear member-specific local conversation state correctly on sign-out or account change.
- Do not add a history drawer, rename button or conversation-management redesign yet.

If direct client reads are used to restore messages:

- Use the authenticated Supabase client.
- Rely on correctly tested owner-only RLS.
- Fetch only the active member’s selected conversation.
- Never use the service-role key in frontend code.

5. TARGETED TESTS

Add or update focused tests for:

- First message creates one conversation and returns its UUID.
- A second message uses the same conversation.
- Previous persisted messages are passed to Gemini in deterministic order.
- The newest user message appears exactly once.
- Refresh/restoration loads the prior transcript.
- Widget close/reopen retains the active conversation.
- A different member cannot read or write the conversation.
- Passing another member’s UUID to `ai-chat` is rejected.
- Service-role queries still enforce explicit ownership predicates.
- Repeated submission with the same request/message UUID does not duplicate the user message.
- Provider failure leaves a defined recoverable state without a fake assistant response.
- Existing tool calling still works.
- Existing approved/verified member restrictions still work.
- Sign-out clears or disconnects the active member’s conversation state.
- Existing unrelated frontend and Supabase behaviour remains unchanged.

6. DOCUMENTATION AND VERIFICATION

Update:

- `BOOKS_MEMORY_DIAGNOSIS.md` with the implemented Phase 1 architecture.
- `docs/CHAT_WIDGET.md` so it describes the active Supabase `ai-chat` flow instead of the stale mock endpoint.

Run:

- Targeted tests for changed components/functions.
- Type-check.
- Lint relevant files.
- Production build if practical.
- Supabase migration validation if available.

Do not deploy, push or apply the production migration unless explicitly instructed.

FINAL REPORT

Provide a concise report containing:

- Root solution implemented
- Identity/ownership mapping selected
- Tables, constraints, indexes and RLS policies added
- Edge Function changes
- Frontend changes
- Failure and retry behaviour
- Context limit temporarily used
- Tests and build results
- Files changed
- Exact Supabase migration/function deployment commands Martin must run
- Any manual configuration required
- Remaining work for the later history-interface and summarisation phases

Stop after completing Phase 1.
