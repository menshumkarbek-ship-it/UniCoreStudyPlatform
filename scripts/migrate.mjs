// Applies pending SQL migrations from db/migrations in filename order.
// Each migration runs in its own transaction; an advisory lock keeps two
// deploys from migrating at the same time.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const migrationsDirectory = path.join(import.meta.dirname, "..", "db", "migrations");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("SELECT pg_advisory_lock(727274001)");
  await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const applied = new Set((await client.query("SELECT version FROM schema_migrations")).rows.map((row) => row.version));
  const files = (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(migrationsDirectory, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw new Error(`Migration ${file} failed: ${error.message}`);
    }
    console.log(`Applied ${file}`);
    count += 1;
  }
  console.log(count ? `Database is up to date (${count} migration${count === 1 ? "" : "s"} applied).` : "Database is already up to date.");
} finally {
  await client.query("SELECT pg_advisory_unlock(727274001)").catch(() => undefined);
  await client.end();
}
