/**
 * Applies ordered *.sql files from db/migrations/ against DATABASE_URL.
 * Tracking table schema_migrations makes re-runs idempotent per filename.
 *
 * Loads env from .env then .env.local (same layering as typical Next setups);
 * standalone tsx does not load these files unless we do explicitly.
 */

import { config as loadDotenv } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";

function loadEnvFiles(): void {
  const root = process.cwd();
  loadDotenv({ path: path.join(root, ".env") });
  loadDotenv({ path: path.join(root, ".env.local"), override: true });
}

async function ensureMigrationsTable(client: Client): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function main(): Promise<void> {
  loadEnvFiles();
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error(
      "[db:migrate] DATABASE_URL is missing. Add it to .env in the project " +
        "root (see .env.example) or export it in your shell.",
    );
    process.exit(1);
  }

  const migrationsDir = path.join(process.cwd(), "db", "migrations");

  let entries: string[];
  try {
    entries = await fs.readdir(migrationsDir);
  } catch {
    console.error(
      `[db:migrate] Cannot read migrations directory: ${migrationsDir}`,
    );
    process.exit(1);
  }

  const migrationFiles = entries
    .filter((name) => name.endsWith(".sql"))
    .sort();

  if (migrationFiles.length === 0) {
    console.error("[db:migrate] No .sql migrations found.");
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    await ensureMigrationsTable(client);

    const applied = await client.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations",
    );
    const appliedSet = new Set(
      applied.rows.map((row) => row.filename),
    );

    for (const filename of migrationFiles) {
      if (appliedSet.has(filename)) {
        console.log(`[db:migrate] skip (already applied): ${filename}`);
        continue;
      }

      const filePath = path.join(migrationsDir, filename);
      const sql = await fs.readFile(filePath, "utf8");

      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [filename],
        );
        await client.query("COMMIT");
        appliedSet.add(filename);
        console.log(`[db:migrate] applied: ${filename}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
  } finally {
    await client.end();
  }

  console.log("[db:migrate] finished.");
}

main().catch((err: unknown) => {
  console.error("[db:migrate]", err);
  process.exit(1);
});
