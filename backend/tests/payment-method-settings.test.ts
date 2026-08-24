import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("payment method settings migration keeps reads public and writes admin-only", async () => {
  const migration = await readFile(
    path.join(backendRoot, "supabase/migrations/20260824223000_payment_method_settings.sql"),
    "utf8",
  );

  assert.match(migration, /CREATE TABLE public\.payment_method_settings/);
  assert.match(migration, /FOR SELECT TO anon, authenticated/);
  assert.match(migration, /payment_method_settings_admin_insert/);
  assert.match(migration, /payment_method_settings_admin_update/);
  assert.match(migration, /current_user_is_admin\(\)/);
});

test("checkout guard runs before any new contribution or membership order", async () => {
  const functionSource = await readFile(
    path.join(backendRoot, "supabase/functions/paystack-checkout/index.ts"),
    "utf8",
  );
  const guard = functionSource.indexOf("await assertOnlinePaymentsEnabled();");
  const contributionOrder = functionSource.indexOf('.from("contribution_orders")');
  const membershipOrder = functionSource.indexOf('.from("membership_orders")');
  const verification = functionSource.indexOf('body.action === "verify"');

  assert.ok(guard > verification);
  assert.ok(guard < contributionOrder);
  assert.ok(guard < membershipOrder);
  assert.match(functionSource, /if \(error \|\| !data\?\.online_payments_enabled\)/);
});
