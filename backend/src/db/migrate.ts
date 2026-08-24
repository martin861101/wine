import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { pool } from "./pool";

const MIGRATIONS_DIR = path.join(process.cwd(), "src", "db", "migrations");

export async function runMigrations(): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

    for (const file of files) {
      const exists = await client.query("SELECT 1 FROM _migrations WHERE name = $1", [file]);
      if (exists.rowCount && exists.rowCount > 0) continue;

      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
        await client.query("COMMIT");
        applied.push(file);
      } catch (error) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
      }
    }
    return applied;
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then((applied) => {
      console.log(
        applied.length ? `Applied migrations: ${applied.join(", ")}` : "No pending migrations.",
      );
      return pool.end();
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
