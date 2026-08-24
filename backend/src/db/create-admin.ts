import { db } from "./db";
import { runMigrations } from "./migrate";
import { hashPassword } from "../lib/password";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

async function main() {
  const email = requiredEnv("ADMIN_EMAIL").toLowerCase();
  const password = requiredEnv("ADMIN_PASSWORD");

  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters long.");
  }

  try {
    await runMigrations();
    const passwordHash = await hashPassword(password);
    await db.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, email_verified, approved, region)
       VALUES ($1, $2, 'Test', 'Admin', 'ADMIN', true, true, 'Johannesburg')
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         role = 'ADMIN',
         email_verified = true,
         approved = true,
         region = EXCLUDED.region,
         updated_at = now()`,
      [email, passwordHash],
    );
    console.log(`Admin account ready: ${email}`);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
