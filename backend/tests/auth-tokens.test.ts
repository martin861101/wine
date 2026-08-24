import assert from "node:assert/strict";
import test from "node:test";

import {
  createAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from "../src/lib/tokens";

const accessSecret = "test-access-secret-that-is-long-enough";
const refreshSecret = "test-refresh-secret-that-is-long-enough";

test("access tokens round-trip and reject tampering", () => {
  const token = createAccessToken({ sub: "member-1", role: "MEMBER" }, accessSecret, 60);
  assert.deepEqual(verifyAccessToken(token, accessSecret), { sub: "member-1", role: "MEMBER" });
  assert.equal(verifyAccessToken(`${token}tampered`, accessSecret), null);
  assert.equal(verifyAccessToken(token, "wrong-secret-that-is-long-enough"), null);
});

test("expired access tokens are rejected", () => {
  const token = createAccessToken({ sub: "member-1", role: "MEMBER" }, accessSecret, -1);
  assert.equal(verifyAccessToken(token, accessSecret), null);
});

test("refresh tokens round-trip and reject the wrong secret", () => {
  const token = signRefreshToken("member-1", refreshSecret, 1);
  assert.deepEqual(verifyRefreshToken(token, refreshSecret), { sub: "member-1" });
  assert.equal(verifyRefreshToken(token, "wrong-secret-that-is-long-enough"), null);
});
