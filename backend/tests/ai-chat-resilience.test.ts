import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { handleError, HttpError } from "../supabase/functions/_shared/http.ts";
import { callGemini, type GeminiContent } from "../supabase/functions/ai-chat/gemini.ts";
import { runToolLoop } from "../supabase/functions/ai-chat/tool-loop.ts";
import type { ToolContext } from "../supabase/functions/ai-chat/tools/registry.ts";

const functionUrl = new URL("../supabase/functions/ai-chat/index.ts", import.meta.url);
const sharedAuthUrl = new URL("../supabase/functions/_shared/supabase.ts", import.meta.url);
const configUrl = new URL("../supabase/config.toml", import.meta.url);
const migrationUrl = new URL(
  "../supabase/migrations/20260824213000_books_memory_phase1.sql",
  import.meta.url,
);

const modelContents: GeminiContent[] = [
  { role: "user", parts: [{ text: "Recommend a short novel." }] },
];

function providerResponse(payload: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json", "x-request-id": "provider-request-1" },
    ...init,
  });
}

async function expectHttpError(
  operation: () => Promise<unknown>,
  expected: Partial<Pick<HttpError, "status" | "retryable" | "category" | "upstreamStatus">>,
): Promise<HttpError> {
  let caught: unknown;
  try {
    await operation();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught instanceof HttpError);
  for (const [key, value] of Object.entries(expected)) {
    assert.equal(caught[key as keyof HttpError], value, key);
  }
  return caught;
}

test("shared HTTP handling logs the actual unexpected exception while returning a generic body", async () => {
  const logCalls: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => logCalls.push(args);
  let response: Response | null = null;
  try {
    response = handleError(
      new Request("https://wineandchapters.co.za/functions/v1/test"),
      new Error("diagnostic message"),
    );
  } finally {
    console.error = originalError;
  }
  assert.ok(response);
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { message: "Something went wrong." });
  assert.equal((logCalls[0]?.[1] as Record<string, unknown>)?.errorMessage, "diagnostic message");
  assert.match(
    String((logCalls[0]?.[1] as Record<string, unknown>)?.errorStack),
    /diagnostic message/,
  );
});

test("Gemini success returns validated text and sends the configured tool policy", async () => {
  let sentBody: Record<string, unknown> = {};
  const result = await callGemini("test-key", "test-model", modelContents, {
    systemInstruction: "Safe system instruction",
    functionDeclarations: [{ name: "search_books" }],
    fetchImpl: async (_input, init) => {
      sentBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return providerResponse({
        candidates: [{ content: { parts: [{ text: "Try Convenience Store Woman." }] } }],
      });
    },
  });

  assert.equal(result.parts[0]?.text, "Try Convenience Store Woman.");
  assert.ok(Array.isArray(sentBody?.tools));
});

test("Gemini network failure is a retryable 502", async () => {
  await expectHttpError(
    () =>
      callGemini("test-key", "test-model", modelContents, {
        fetchImpl: async () => {
          throw new TypeError("fetch failed");
        },
      }),
    { status: 502, retryable: true, category: "provider_network" },
  );
});

test("Gemini timeout aborts the request and is a retryable 504", async () => {
  await expectHttpError(
    () =>
      callGemini("test-key", "test-model", modelContents, {
        timeoutMs: 5,
        fetchImpl: async (_input, init) =>
          await new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      }),
    { status: 504, retryable: true, category: "provider_timeout" },
  );
});

test("Gemini 429 preserves safe upstream metadata", async () => {
  const error = await expectHttpError(
    () =>
      callGemini("test-key", "test-model", modelContents, {
        fetchImpl: async () =>
          providerResponse(
            { error: { code: 429, status: "RESOURCE_EXHAUSTED", message: "private body" } },
            { status: 429 },
          ),
      }),
    { status: 429, retryable: true, upstreamStatus: 429 },
  );
  assert.match(error.category ?? "", /^provider_rate_limited/);
  assert.equal(error.upstreamRequestId, "provider-request-1");
  assert.doesNotMatch(error.message, /private body/);
});

test("Gemini 5xx maps to a retryable 502", async () => {
  await expectHttpError(
    () =>
      callGemini("test-key", "test-model", modelContents, {
        fetchImpl: async () => providerResponse({ error: { status: "INTERNAL" } }, { status: 503 }),
      }),
    { status: 502, retryable: true, category: "provider_upstream_5xx", upstreamStatus: 503 },
  );
});

test("non-JSON provider errors are safely categorized", async () => {
  const error = await expectHttpError(
    () =>
      callGemini("test-key", "test-model", modelContents, {
        fetchImpl: async () => new Response("upstream private response", { status: 400 }),
      }),
    { status: 502, retryable: false, upstreamStatus: 400 },
  );
  assert.equal(error.category, "provider_rejected:non_json");
  assert.doesNotMatch(error.message, /upstream private response/);
});

test("Gemini authentication failures are non-retryable and secret-safe", async () => {
  await expectHttpError(
    () =>
      callGemini("test-key", "test-model", modelContents, {
        fetchImpl: async () =>
          providerResponse({ error: { status: "UNAUTHENTICATED" } }, { status: 401 }),
      }),
    { status: 503, retryable: false, category: "provider_authentication", upstreamStatus: 401 },
  );
});

test("empty or malformed Gemini response shapes fail safely", async (t) => {
  await t.test("empty candidates", async () => {
    await expectHttpError(
      () =>
        callGemini("test-key", "test-model", modelContents, {
          fetchImpl: async () => providerResponse({ candidates: [] }),
        }),
      { status: 502, retryable: true, category: "provider_empty_candidates" },
    );
  });
  await t.test("missing content", async () => {
    await expectHttpError(
      () =>
        callGemini("test-key", "test-model", modelContents, {
          fetchImpl: async () => providerResponse({ candidates: [{}] }),
        }),
      { status: 502, retryable: true, category: "provider_malformed_response" },
    );
  });
  await t.test("empty parts", async () => {
    await expectHttpError(
      () =>
        callGemini("test-key", "test-model", modelContents, {
          fetchImpl: async () => providerResponse({ candidates: [{ content: { parts: [] } }] }),
        }),
      { status: 502, retryable: true, category: "provider_empty_parts" },
    );
  });
});

test("malformed Gemini function calls are rejected before execution", async () => {
  const error = await expectHttpError(
    () =>
      callGemini("test-key", "test-model", modelContents, {
        fetchImpl: async () =>
          providerResponse({
            candidates: [{ content: { parts: [{ functionCall: { name: "", args: [] } }] } }],
          }),
      }),
    { status: 502, retryable: true, category: "provider_malformed_function_call" },
  );
  assert.equal(error.upstreamRequestId, "provider-request-1");
});

test("tool execution failure is logged safely and returned to Gemini as a generic tool result", async () => {
  const logCalls: unknown[][] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => logCalls.push(args);
  let callCount = 0;
  try {
    const result = await runToolLoop(
      modelContents,
      {} as ToolContext,
      async (contents) => {
        callCount += 1;
        if (callCount === 1) {
          return {
            role: "model",
            parts: [{ functionCall: { name: "search_books", args: { query: "private query" } } }],
          };
        }
        const response = contents.at(-1)?.parts[0]?.functionResponse?.response;
        assert.deepEqual(response, { ok: false, error: "The action could not be completed." });
        return { role: "model", parts: [{ text: "I could not complete that lookup." }] };
      },
      async () => {
        throw new Error("internal tool failure");
      },
    );
    assert.equal(result.reply, "I could not complete that lookup.");
  } finally {
    console.error = originalError;
  }
  assert.equal(logCalls.length, 1);
  assert.deepEqual(logCalls[0]?.[1], {
    toolName: "search_books",
    errorType: "Error",
    errorMessage: "internal tool failure",
  });
  assert.doesNotMatch(JSON.stringify(logCalls), /private query/);
});

test("a fifth tool request becomes an explicit retryable error", async () => {
  let callCount = 0;
  await expectHttpError(
    () =>
      runToolLoop(
        modelContents,
        {} as ToolContext,
        async (_contents, allowTools) => {
          callCount += 1;
          assert.equal(allowTools, callCount <= 4);
          return {
            role: "model",
            parts: [{ functionCall: { name: "search_books", args: {} } }],
          };
        },
        async () => ({ response: { ok: true } }),
      ),
    { status: 502, retryable: true, category: "tool_loop_exhausted" },
  );
});

test("assistant insert recovery, idempotent retry, and safe failure metadata remain enforced", async () => {
  const [source, migration] = await Promise.all([
    readFile(functionUrl, "utf8"),
    readFile(migrationUrl, "utf8"),
  ]);
  assert.match(source, /if \(assistantError \|\| !insertedAssistant\)/);
  assert.match(source, /\.eq\("role", "assistant"\)/);
  assert.match(source, /category: "assistant_persistence"/);
  assert.match(source, /\.eq\("id", userRow\.id\)\s*\n\s*\.eq\("status", "failed"\)/);
  assert.match(source, /\.eq\("id", currentUserMessage\.id\)\s*\n\s*\.eq\("status", "pending"\)/);
  assert.match(source, /failureStage,\s*\n\s*failureCategory: category,\s*\n\s*errorId,/);
  assert.match(source, /\{ message, errorId, \.\.\.persistedContext, retryable \}/);
  assert.match(migration, /UNIQUE \(conversation_id, role, request_id\)/);
});

test("gateway JWT verification is intentionally disabled while member auth is enforced internally", async () => {
  const [source, sharedAuth, config] = await Promise.all([
    readFile(functionUrl, "utf8"),
    readFile(sharedAuthUrl, "utf8"),
    readFile(configUrl, "utf8"),
  ]);
  assert.match(config, /\[functions\.ai-chat\][\s\S]*?verify_jwt = false/);
  assert.match(source, /requireMember\(request\)/);
  assert.match(sharedAuth, /if \(!authorization\?\.startsWith\("Bearer "\)\)/);
  assert.match(sharedAuth, /client\.auth\.getUser\(token\)/);
  assert.match(sharedAuth, /!member\.email_verified \|\| member\.blocked \|\| member\.deleted_at/);
});
