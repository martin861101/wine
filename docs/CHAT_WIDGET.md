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

Only approved, email-verified members can invoke `ai-chat`. Conversation/message RLS is owner-only and deliberately has no site-administrator transcript exception. Because the Edge Function uses the service-role client, it also includes `owner_id = authenticated public.users.id` in conversation/history queries rather than relying on RLS.

The frontend uses only the configured Supabase publishable key. Never expose `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, or `TAVILY_API_KEY` in `VITE_*` variables.

## Failure and retry behavior

The user message is stored as `pending` before Gemini runs. On success, the assistant reply is inserted and the user message becomes `complete`. On provider/configuration failure, the user message becomes `failed`; no fake assistant row is stored. The response includes the persisted conversation/message IDs, and retrying with the same request UUID changes that message back to `pending` instead of duplicating it. Concurrent reuse of a pending request receives HTTP 409.

## Temporary context bound

Phase 1 supplies at most 39 completed prior messages plus the current persisted user message (40 total). Messages are not clipped at 1,000 characters and adjacent same-role messages are retained. Rolling token-budget summaries are deferred to a later phase.

## Relevant files

- `ui/src/components/site/demo-chat-widget.tsx`
- `ui/src/lib/api.ts`
- `backend/supabase/functions/ai-chat/index.ts`
- `backend/supabase/functions/ai-chat/memory.ts`
- `backend/supabase/migrations/20260824213000_books_memory_phase1.sql`

## Deployment (manual, not run by this change)

From `backend/`, after linking the intended project and reviewing the target:

```sh
npx supabase migration list --linked
npx supabase migration up --linked --include-all
npx supabase functions deploy ai-chat --project-ref <project-ref>
```

The existing `GEMINI_API_KEY`, optional `GEMINI_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGIN`, and tool-provider secrets must remain configured for `ai-chat`.
