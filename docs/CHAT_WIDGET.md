# Books Chat Widget

## Status

The floating Books widget is the live authenticated reading-room companion. Its appearance and tool actions remain unchanged, while Phase 1 stores one active persistent conversation per approved member.

## Active flow

```text
Authenticated browser
  -> restore owner-visible conversation/messages through Supabase RLS
  -> invoke Supabase Edge Function ai-chat
  -> authenticate and require approved, verified public.users member
  -> verify conversation UUID + public.users.id ownership explicitly
  -> persist idempotent user message
  -> load recent completed database messages in deterministic order
  -> Gemini and existing tool-call loop
  -> persist assistant reply
  -> return reply, actions, conversation ID, and message IDs
```

The browser sends `{ message, conversationId, requestId }`. `requestId` is a stable UUID reused for a retry. The first request may omit `conversationId`; `ai-chat` creates an owner-scoped conversation and returns its UUID. Caller-supplied history is not accepted as model context.

## Persistence and restoration

- `ai_conversations.owner_id` references `public.users.id`, which maps from `auth.uid()` through `users.auth_user_id`.
- `ai_messages.sequence` provides deterministic transcript ordering.
- The authenticated browser stores only the active conversation UUID in a member-namespaced local-storage key. Message content remains in Supabase.
- On auth restoration the widget validates that selected UUID through RLS, falls back to the member's most recent conversation, and loads its transcript.
- The greeting is a display-only message and is never inserted into the database.
- Closing/reopening, route navigation, and refresh retain the conversation. Sign-out/account change disconnects in-memory state and removes the previous member's local selection.

## Authorization

Only verified, active members can invoke `ai-chat`. Conversation/message RLS is owner-only and deliberately has no site-administrator transcript exception. Because the Edge Function uses the service-role client, it also includes `owner_id = authenticated public.users.id` in conversation/history queries rather than relying on RLS.

`backend/supabase/config.toml` intentionally sets `verify_jwt = false` for `ai-chat`. This avoids relying on gateway JWT decoding, so Supabase invocation summaries can show `auth_user: null`. It does not make the function anonymous: `requireMember` requires a bearer token, validates it with `client.auth.getUser(token)`, resolves the linked `public.users` row, and rejects unverified, blocked, deleted, or missing members before any conversation or tool access. A local unauthenticated request must return HTTP 401.

The frontend uses only the configured Supabase publishable key. Never expose `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, or `TAVILY_API_KEY` in `VITE_*` variables.

## Failure and retry behavior

The user message is stored as `pending` before Gemini runs. On success, the assistant reply is inserted and the user message becomes `complete`. On provider/configuration failure, the user message becomes `failed`; no fake assistant row is stored. Its metadata contains only `failureStage`, `failureCategory`, `errorId`, `retryable`, and `retryCount`—never stack traces or provider bodies.

Unexpected errors retain a generic browser message and add a correlation UUID:

```json
{
  "message": "Something went wrong.",
  "errorId": "...",
  "conversationId": "...",
  "userMessageId": "...",
  "retryable": true
}
```

Server logs correlate that ID with HTTP status, request/conversation/message IDs, stage/category, exception name/message/stack, and safe upstream status/request ID. They do not include prompts, conversation text, authorization headers, Supabase/Gemini credentials, tool arguments, or full upstream bodies.

Retrying sends the same request UUID. The function atomically changes the existing failed user-message row back to `pending` and increments `retryCount`; the database uniqueness constraint on `(conversation_id, role, request_id)` prevents duplicate user and assistant rows. A pending duplicate receives HTTP 409. If concurrent requests race after inference, an assistant insert conflict is recovered by returning the already completed owner-scoped assistant row, and failure updates only target a still-`pending` user row so they cannot overwrite a completed result.

Gemini has a 20-second timeout covering the request and response body. Provider mappings are:

| Provider condition                   | Browser status | Retryable | Safe category                                 |
| ------------------------------------ | -------------: | :-------: | --------------------------------------------- |
| Timeout                              |            504 |    yes    | `provider_timeout`                            |
| Network/response read failure        |            502 |    yes    | `provider_network` / `provider_response_read` |
| HTTP 429                             |            429 |    yes    | `provider_rate_limited`                       |
| HTTP 401/403                         |            503 |    no     | `provider_authentication`                     |
| HTTP 5xx                             |            502 |    yes    | `provider_upstream_5xx`                       |
| Other rejected request               |            502 |    no     | `provider_rejected`                           |
| Invalid JSON/shape or empty response |            502 |    yes    | response-specific provider category           |

Gemini responses are validated before candidates, parts, or function calls are used. Tool failures are logged without arguments and returned to Gemini as a generic tool result, allowing the model to continue. Four tool-calling rounds are allowed; a fifth call triggers one tool-free summarisation request, and a missing final answer becomes a retryable upstream error instead of incomplete text.

## Temporary context bound

Phase 1 supplies at most 39 completed prior messages plus the current persisted user message (40 total). Messages are not clipped at 1,000 characters and adjacent same-role messages are retained. Rolling token-budget summaries are deferred to a later phase.

## Relevant files

- `ui/src/components/site/demo-chat-widget.tsx`
- `ui/src/lib/api.ts`
- `backend/supabase/functions/ai-chat/index.ts`
- `backend/supabase/functions/ai-chat/gemini.ts`
- `backend/supabase/functions/ai-chat/tool-loop.ts`
- `backend/supabase/functions/ai-chat/memory.ts`
- `backend/supabase/functions/_shared/http.ts`
- `backend/supabase/migrations/20260824213000_books_memory_phase1.sql`
- `backend/tests/ai-chat-resilience.test.ts`

## Deployment

From `backend/`, after linking the intended project and reviewing the target:

```sh
npx supabase functions deploy ai-chat --project-ref <project-ref>
```

The existing `GEMINI_API_KEY`, optional `GEMINI_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN`, and tool-provider secrets must remain configured for `ai-chat`.

The resilience update was deployed on 2026-08-26 as active `ai-chat` version 18 with `verify_jwt=false`; a production unauthenticated smoke request returned HTTP 401 from internal member authentication.
