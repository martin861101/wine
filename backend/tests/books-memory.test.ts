import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildModelContents,
  RECENT_MESSAGE_LIMIT,
  requireUuid,
} from "../supabase/functions/ai-chat/memory.ts";
import { activeConversationStorageKey } from "../../ui/src/lib/books-memory.ts";

const migrationUrl = new URL(
  "../supabase/migrations/20260824213000_books_memory_phase1.sql",
  import.meta.url,
);
const functionUrl = new URL("../supabase/functions/ai-chat/index.ts", import.meta.url);
const widgetUrl = new URL("../../ui/src/components/site/demo-chat-widget.tsx", import.meta.url);
const apiUrl = new URL("../../ui/src/lib/api.ts", import.meta.url);

test("persisted history is deterministic and includes the current user message exactly once", () => {
  const longText = "x".repeat(1_500);
  const current = { id: "current", role: "user" as const, content: "latest", sequence: 4 };
  const contents = buildModelContents(
    [
      { id: "three", role: "assistant", content: longText, sequence: 3 },
      { id: "one", role: "user", content: "first", sequence: 1 },
      { id: "two", role: "user", content: "adjacent user", sequence: 2 },
      current,
    ],
    current,
  );

  assert.deepEqual(
    contents.map((item) => item.role),
    ["user", "user", "model", "user"],
  );
  assert.equal(contents[2]?.parts[0]?.text.length, 1_500, "history must not be clipped at 1,000");
  assert.equal(
    contents.flatMap((item) => item.parts).filter((part) => part.text === "latest").length,
    1,
  );
  assert.equal(RECENT_MESSAGE_LIMIT, 40);
});

test("conversation and request identifiers require UUIDs", () => {
  const id = "9be7663a-7653-4d9d-a9d0-b6887a83944a";
  assert.equal(requireUuid(id, "ID"), id);
  assert.throws(() => requireUuid("12", "ID"), /valid UUID/);
});

test("member-specific browser keys isolate active conversations", () => {
  assert.notEqual(
    activeConversationStorageKey("member-a"),
    activeConversationStorageKey("member-b"),
  );
});

test("migration uses application-user ownership, constraints, and private owner-only RLS", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /owner_id UUID NOT NULL REFERENCES public\.users\(id\) ON DELETE CASCADE/);
  assert.match(
    sql,
    /conversation_id UUID NOT NULL REFERENCES public\.ai_conversations\(id\) ON DELETE CASCADE/,
  );
  assert.match(sql, /UNIQUE \(conversation_id, role, request_id\)/);
  assert.match(sql, /UNIQUE \(owner_id, initial_request_id\)/);
  assert.match(sql, /owner_id = public\.app_user_id\(\)/);
  assert.match(sql, /role = 'user'\s+AND status = 'pending'/);
  assert.doesNotMatch(sql, /current_user_is_admin/);
  assert.match(sql, /Conversation ownership cannot be changed/);
});

test("Edge Function creates once, scopes service queries, persists safe failure metadata, and returns IDs", async () => {
  const source = await readFile(functionUrl, "utf8");
  assert.equal(source.match(/\.from\("ai_conversations"\)\s*\n\s*\.insert/g)?.length, 1);
  assert.ok((source.match(/\.eq\("owner_id", ownerId\)/g)?.length ?? 0) >= 3);
  assert.match(source, /\.eq\("initial_request_id", requestId\)/);
  assert.ok((source.match(/\.eq\("ai_conversations\.owner_id", ownerId\)/g)?.length ?? 0) >= 2);
  assert.doesNotMatch(source, /body\.history|parseHistory/);
  assert.ok(source.indexOf('role: "user"') < source.indexOf("callGemini(apiKey"));
  assert.match(source, /status: "failed",\s*\n\s*metadata: \{/);
  assert.match(source, /failureCategory: category/);
  assert.match(source, /errorId,/);
  assert.match(source, /retryable,/);
  assert.match(source, /conversationId,\s*\n\s*userMessageId:/);
  assert.match(source, /assistantMessageId:/);
  assert.match(source, /executeTool,/);
});

test("widget restores, reconciles persisted UUIDs, retries stably, and clears account state", async () => {
  const [widget, api] = await Promise.all([readFile(widgetUrl, "utf8"), readFile(apiUrl, "utf8")]);
  assert.match(widget, /restoreConversation\(preferredConversationId\)/);
  assert.match(
    widget,
    /retryRequest\?\.text === text \? retryRequest\.id : crypto\.randomUUID\(\)/,
  );
  assert.match(widget, /id: result\.userMessageId/);
  assert.match(
    widget,
    /localStorage\.removeItem\(activeConversationStorageKey\(previousMemberId\)\)/,
  );
  assert.match(api, /\.eq\("conversation_id", conversation\.id\)\s*\n\s*\.order\("sequence"/);
  assert.match(api, /message,\s*\n\s*conversationId,\s*\n\s*requestId/);
  assert.doesNotMatch(api, /history\.slice/);
});
