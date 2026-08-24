import assert from "node:assert/strict";
import test from "node:test";

import { hashPassword, verifyPassword } from "../src/lib/password";

test("password hashes verify without exposing the original password", async () => {
  const password = "A secure member password 123!";
  const hash = await hashPassword(password);
  assert.notEqual(hash, password);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("another password", hash), false);
});
