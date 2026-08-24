import assert from "node:assert/strict";
import test from "node:test";

import { aiActionSchema, parseAIActions } from "../../ui/src/lib/ai-actions.ts";
import {
  canOfferProactive,
  dismissProactive,
  markProactiveShown,
  parseProactiveState,
} from "../../ui/src/lib/ai-proactive.ts";

test("AI action schema accepts only whitelisted destinations and action shapes", () => {
  assert.equal(aiActionSchema.safeParse({ type: "NAVIGATE", destination: "events" }).success, true);
  assert.equal(
    aiActionSchema.safeParse({ type: "NAVIGATE", destination: "javascript:alert(1)" }).success,
    false,
  );
  assert.equal(
    aiActionSchema.safeParse({ type: "TRIGGER_EFFECT", effect: "run_arbitrary_code" }).success,
    false,
  );
});

test("AI action parsing rejects invalid values without dropping valid actions", () => {
  const actions = parseAIActions([
    { type: "SET_MOOD", mood: "cosy" },
    { type: "SET_MOOD", mood: "neon" },
    { type: "SHOW_TOAST", message: "x".repeat(161), toastType: "info" },
  ]);
  assert.deepEqual(actions, [{ type: "SET_MOOD", mood: "cosy" }]);
});

test("audio actions only accept Spotify destinations", () => {
  const base = {
    type: "SHOW_AUDIO",
    title: "A novel",
    provider: "spotify",
  };
  assert.equal(
    aiActionSchema.safeParse({ ...base, url: "https://open.spotify.com/search/audiobook" }).success,
    true,
  );
  assert.equal(aiActionSchema.safeParse({ ...base, url: "https://example.com" }).success, false);
});

test("proactive interactions enforce maximum, cooldown, and dismissal", () => {
  const now = 1_800_000;
  const initial = parseProactiveState(null);
  assert.equal(canOfferProactive(initial, now), true);

  const shown = markProactiveShown(initial, now);
  assert.equal(canOfferProactive(shown, now + 60_000), false);
  assert.equal(canOfferProactive(shown, now + 31 * 60_000, { maxInteractions: 2 }), true);
  assert.equal(canOfferProactive(dismissProactive(initial), now + 31 * 60_000), false);
});

test("malformed proactive session state fails closed to safe defaults", () => {
  assert.deepEqual(parseProactiveState("not-json"), {
    count: 0,
    lastAt: 0,
    dismissed: false,
  });
});
