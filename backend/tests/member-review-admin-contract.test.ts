import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL(
  "../supabase/migrations/20260826120000_reviews_members_admin_auth.sql",
  import.meta.url,
);
const adminFunctionUrl = new URL("../supabase/functions/admin-members/index.ts", import.meta.url);
const sharedAuthUrl = new URL("../supabase/functions/_shared/supabase.ts", import.meta.url);

test("structured review contract retains every form field", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  for (const field of [
    "book_title",
    "book_author",
    "overall_rating",
    "genre",
    "book_format",
    "picked_by",
    "started_on",
    "finished_on",
    "spice_level",
    "tear_level",
    "made_me_feel",
    "thoughts",
    "favourite_quotes",
    "recommendation",
    "contains_spoilers",
    "user_id",
  ]) {
    assert.match(migration, new RegExp(`\\b${field}\\b`));
  }
  assert.match(migration, /AND status = 'PENDING'/);
  assert.match(migration, /WHERE r\.status = 'PUBLISHED'/);
});

test("membership access uses verification and block state, not administrator approval", async () => {
  const [migration, sharedAuth] = await Promise.all([
    readFile(migrationUrl, "utf8"),
    readFile(sharedAuthUrl, "utf8"),
  ]);
  assert.match(migration, /ALTER COLUMN approved SET DEFAULT TRUE/);
  assert.match(migration, /SELECT email_verified AND NOT blocked AND deleted_at IS NULL/);
  assert.doesNotMatch(sharedAuth, /member\.approved/);
  assert.match(sharedAuth, /member\.blocked/);
});

test("admin member operations enforce protected actions and write audits", async () => {
  const source = await readFile(adminFunctionUrl, "utf8");
  for (const action of ["password-reset", "resend-confirmation", "block", "unblock", "remove"]) {
    assert.match(source, new RegExp(`"${action}"`));
  }
  assert.match(source, /requireAdmin\(request\)/);
  assert.match(source, /LAST_ADMIN_PROTECTED/);
  assert.match(source, /SELF_PROTECTION/);
  assert.match(source, /admin_set_member_blocked/);
  assert.match(source, /confirmation !== "REMOVE"/);
  assert.match(source, /client\.auth\.admin\.deleteUser/);
  assert.match(source, /success: false/);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY/);
});

test("last-admin state changes are serialized in a service-role-only transaction", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /auth\.role\(\) IS DISTINCT FROM 'service_role'/);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.admin_set_member_blocked\(UUID, UUID, BOOLEAN\) FROM PUBLIC, anon, authenticated/,
  );
  assert.match(migration, /GRANT SELECT, UPDATE ON TABLE public\.users TO service_role/);
});
