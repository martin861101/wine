# Books AI conversation-memory diagnosis

**Scope:** initial static repository inspection and Phase 1 implementation on 2026-08-24. No production migration or function was deployed, and no production data, message content, or secrets were inspected.

## Phase 1 implementation (2026-08-24)

The diagnosis below records the pre-fix evidence. Phase 1 now adds repository-backed persistent transcripts:

- `ai_conversations.owner_id` references the application identity `public.users.id`. Supabase `auth.uid()` maps to it through `users.auth_user_id` and `public.app_user_id()`; application user IDs and Auth IDs are not assumed interchangeable.
- `ai_messages` uses UUID message IDs, a per-conversation identity sequence for deterministic order, constrained roles/statuses, compact JSON metadata, and a request UUID unique per conversation and role. Conversation deletion cascades to messages.
- Owner-only RLS uses `public.app_user_id()` and `public.current_user_is_active()`. Private transcripts have no administrator exception. Conversation ownership is immutable.
- The service-role `ai-chat` function explicitly filters conversation access by both conversation UUID and authenticated application owner. It creates the first conversation, persists the user message before inference, loads completed database history in ascending order, and persists a successful assistant response.
- Caller `history` is no longer read. Phase 1 temporarily sends at most 39 completed prior messages plus the current persisted user message (40 total) without the old 1,000-character per-message clipping or same-role deduplication.
- A stable request UUID makes user/assistant inserts idempotent. Provider/configuration failure marks the persisted user message `failed`, creates no assistant row, and returns its conversation/message IDs so an explicit retry reuses that record.
- The widget restores the locally selected or most recent owner-visible conversation through the authenticated Supabase client, renders persisted UUID keys, reconciles optimistic messages, and clears the prior member's local selection on sign-out/account change. The greeting remains display-only.

Rolling summaries, embeddings, cross-conversation personal memory, and conversation-management UI remain intentionally out of scope.

## Original conclusion (before Phase 1)

Books cannot meet the expected persistent-conversation behaviour because persistent conversations do not exist in this codebase. There is no `conversations`/`chat_messages` table, migration, RLS policy, client query, or Edge Function read/write for chat history. The widget holds the active transcript only in React component state and sends a client-supplied, bounded subset to `ai-chat` for each request. A refresh, unmount, navigation that remounts the root, or reopening a past conversation therefore has no data to restore.

This is primarily a **persistence and conversation-identity** failure. It is not a database retrieval failure: no retrieval path has been implemented. It also has secondary **prompt-construction/context-trimming** limitations.

## Current message flow

1. `DemoChatWidget` is mounted globally from `ui/src/routes/__root.tsx`. It initializes one greeting and an in-memory `messages` array; individual messages receive incrementing local numeric IDs (`ui/src/components/site/demo-chat-widget.tsx:19-48`). These IDs are recreated on mount and are not conversation IDs.
2. On submit, the widget appends the user turn to React state before inference (`demo-chat-widget.tsx:81-88`). It calls `aiApi.chat(text, messages)` using the _pre-update_ state, so the current turn is supplied separately as `message` rather than duplicated in `history` (`:104`).
3. `aiApi.chat` invokes Supabase Function `ai-chat` with only `{ message, history: history.slice(-8) }` (`ui/src/lib/api.ts:192-210`). The request has no `conversationId`, `conversation_id`, message ID, title, or ordering cursor.
4. The Edge Function validates the current `message`, parses the supplied history, turns assistant messages into Gemini `model` messages and user messages into Gemini `user` messages, then appends the current user message (`backend/supabase/functions/ai-chat/index.ts:96-112`).
5. Gemini returns a reply. The function runs any tool-call loop, returns `{ reply, actions, model }`, and writes nothing. The frontend appends the returned reply only to its in-memory array (`demo-chat-widget.tsx:104-123`). Neither the current user turn nor assistant reply is persisted before or after inference.

## Findings against the requested lifecycle

| Area                               | Evidence-backed finding                                                                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Conversation creation/identity     | None. There is one global widget and local numeric render keys only; no stable conversation ID is generated or transmitted.                                                                                                   |
| Saving user/assistant messages     | None. There are no chat tables in any `backend/supabase/migrations/*.sql`, and neither client nor Edge Function issues an insert/update for chat messages.                                                                    |
| Edge Function history retrieval    | None. `parseHistory(body.history)` accepts only caller-provided data (`ai-chat/index.ts:40-52, 99-101`); it never queries a conversation/message table.                                                                       |
| Message order/model request        | Request order is the client array order after truncation/normalisation, followed by the current message. It is not database ordered. Assistant is mapped to Gemini `model`; user stays `user` (`:106-112`).                   |
| Current-message persistence timing | It is never persisted. It is only appended to UI state before inference and included as the final model input.                                                                                                                |
| Rename                             | No rename UI, API, schema field, or handler exists. There is no title to change and therefore no ID/title coupling to evaluate.                                                                                               |
| Refresh/navigation/reopen          | The component reinitializes to its greeting. Only proactive-prompt state is written to `sessionStorage`, not chat messages (`demo-chat-widget.tsx:27, 37-62`). There is no conversation list or old-conversation reopen flow. |
| Isolation/overwrite                | Multiple durable conversations cannot share or overwrite history because none is stored. Within a mounted browser session there is only one widget transcript, so distinct logical topics cannot be separated.                |
| Ownership                          | No chat-record ownership exists to enforce. The request requires a valid approved, verified member token (`functions/_shared/supabase.ts:37-53`), but that protects invocation, not conversation read/write ownership.        |

## Root causes and secondary context loss

### Primary: absent persistence and stable identity

The schema migration enables RLS for the existing application tables but defines no chat conversation or message table (`backend/supabase/migrations/20260817145733_supabase_native_backend.sql:164-190, 257-280`). The only database use inside `ai-chat` is live tool context through a service-role client; there is no chat query or mutation. This conclusively explains loss on refresh/reopen and makes rename/history-ownership requirements unimplementable as written.

### Secondary: aggressive and lossy request history handling

- The browser limits history to eight messages, then the function applies the same eight-message limit again (`ui/src/lib/api.ts:202-205`; `ai-chat/index.ts:40-42`). This is at most four completed user/assistant exchanges, not a token budget.
- Each retained turn is clipped independently to 1,000 characters (`ai-chat/index.ts:47`). There is no token accounting, summary, or retained durable context. A long turn loses its ending silently.
- `parseHistory` removes an initial assistant greeting and drops every consecutive same-role message (`:50-51`). That can discard legitimate turns if messages were restored in a valid non-alternating form, if an assistant reply has been split, or if retries are represented as adjacent user turns. It is not an appropriate general history normaliser.
- The UI only sends history from the current JavaScript lifetime. Since the server trusts that input, a stale tab, altered browser request, or future client bug can make the model see an arbitrary subset. This does not expose another member's stored history today because no history is stored, but it is not a safe basis for a persistent system.

### Tool-call continuity

Within a single request the loop is structurally valid for Gemini: model content with `functionCall` is pushed, then one `user` content holds matching `functionResponse` parts (`ai-chat/index.ts:121-152`). The function can run up to four rounds and returns the final text/actions.

That tool trace is not preserved after the response: only rendered text is held in the widget, and the next request sends plain `{ role, text }` history. Thus a later model cannot see which tool was called, its arguments, result, or whether the previous reply relied on it. Tool calls/results are therefore valid **in-request**, but not durable or replayable **across turns**.

## Security and RLS assessment

- `ai-chat` has `verify_jwt = false` in `backend/supabase/config.toml`, but the handler independently demands a Bearer token and validates it with Supabase Auth, then checks approved and verified membership. This is adequate request authentication if the handler remains the only entry path.
- The function uses a service-role Supabase client (`functions/_shared/supabase.ts:1-13`), which bypasses RLS. This is intentional for trusted server tools but means any future conversation access must explicitly filter by the authenticated `member.id`; database RLS alone will not protect Edge Function queries made with this client.
- There are no conversation/message RLS policies, because there are no such tables. Consequently owner-only read/write and cross-conversation isolation are currently absent rather than incorrectly configured.
- `assertTrustedOrigin` rejects a mismatched present `Origin`, while authentication remains the meaningful control for non-browser callers. This is not the cause of memory loss.

## Smallest safe fix (not implemented)

Introduce a deliberately scoped persistent transcript rather than a memory framework:

1. Add `ai_conversations` with UUID `id`, `owner_id` referencing the application `users.id`, mutable `title`, timestamps, and optionally an archive/delete timestamp. Add `ai_messages` with UUID/orderable ID, `conversation_id`, role, content, created timestamp, and a constrained message-kind/tool payload model if tool traces are retained.
2. Add owner-only RLS policies for all conversation/message operations. Use the authenticated identity for both RLS and Edge Function queries; when using `serviceClient`, require `owner_id = member.id` in every conversation and message read/write.
3. Create a conversation once and return its immutable UUID. Send that UUID on every chat request. Never derive identity from its title; rename must update only `title` with the same owner/id predicates.
4. In the Edge Function, load messages for that conversation in deterministic ascending order, verify ownership before inference, append the current user message before inference, append the assistant response after successful inference, and return both the reply and conversation/message identifiers. Define an explicit failure-state message policy.
5. On the client, load the owner’s conversation list and selected transcript on mount/reopen; use database message IDs as React keys. Do not accept caller-provided history as the source of truth. Maintain optimistic UI only as a temporary rendering concern.

## Long-conversation recommendation

Use bounded, per-conversation rolling summarisation—not embeddings, vector search, cross-conversation memory, or a new memory framework. Keep the latest complete turns verbatim within a defined token budget, plus one durable `summary` field tied to that same conversation. When the budget would be exceeded, summarize only the oldest already-persisted turns, record the coverage boundary/version, and retain recent turns verbatim. Never delete the raw transcript as part of summarisation. Build the Gemini request as: system instruction, conversation summary (if present), recent messages in ascending order, then the newly persisted current user message. Budget by provider token estimates, not a fixed number of messages or character slicing.

## Targeted tests required

1. Create conversation: returned UUID is stable; two conversations for the same owner remain isolated.
2. Send two sequential turns, refresh, navigate away/back, and reopen the older conversation: exact prior transcript is loaded and supplied in chronological order.
3. Rename: title changes while the conversation UUID, owner, and all messages remain unchanged.
4. Authorization/RLS: owner can list/read/write/rename only their records; a different authenticated user receives no rows/403; direct Edge Function requests with another user's UUID are rejected. Include service-role query tests enforcing `owner_id` filters.
5. Persistence timing and failure: current user message is durable before inference; assistant message is durable once reply succeeds; provider failure has a defined non-duplicating result.
6. Prompt construction: database ordering is ascending and deterministic; newest message appears exactly once; no generic adjacent-role deduplication; configured token budget retains summary plus recent turns.
7. Tool protocol: a tool-call turn stores/reconstructs a valid model-call → user-result sequence, and subsequent inference retains an appropriate compact representation without invalid role ordering.
8. Migration/RLS regression tests: schema constraints prevent orphan messages and title updates cannot change `id` or `owner_id`.

## Documentation drift

`docs/CHAT_WIDGET.md` still describes a mock/local widget and a legacy `/api/ai/discuss` path (`docs/CHAT_WIDGET.md:5-105`), while the active widget now invokes Supabase `ai-chat`. Its accurate statement that no chat table/message persistence exists supports the diagnosis, but the endpoint/behaviour documentation is stale and should be updated when the eventual implementation lands.
