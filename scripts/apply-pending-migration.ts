import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadLocalEnv } from "../lib/db/load-env";
import { createPgPool } from "../lib/db/connection";

loadLocalEnv();

async function main() {
  const pool = createPgPool();
  const migrationPath = resolve(
    process.cwd(),
    "lib/db/migrations/0008_optimal_firebird.sql",
  );
  const sql = readFileSync(migrationPath, "utf8").trim();
  const hash = createHash("sha256").update(sql).digest("hex");

  const [{ count }] = (
    await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM drizzle.__drizzle_migrations WHERE hash = $1",
      [hash],
    )
  ).rows;

  if (Number(count) === 0) {
    console.log("→ Applying pending migration 0008_optimal_firebird.sql");
    await pool.query(sql);
    await pool.query(
      "INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)",
      [hash, Date.now()],
    );
    console.log("✓ Migration 0008 recorded");
  } else {
    console.log("Migration 0008 already recorded");
  }

  const columns = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='products' AND column_name='is_out_of_stock'",
  );
  console.log(
    columns.rows.length > 0
      ? "✓ products.is_out_of_stock exists"
      : "❌ products.is_out_of_stock still missing",
  );

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
