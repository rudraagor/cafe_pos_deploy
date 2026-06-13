import { execSync } from "node:child_process";
import { loadLocalEnv } from "../lib/db/load-env";
import { createPgPool } from "../lib/db/connection";

loadLocalEnv();

const url = process.env.DATABASE_URL ?? "";

function fail(message: string) {
  console.error(`\n❌ ${message}\n`);
  process.exit(1);
}

async function main() {
  if (!url) {
    fail("DATABASE_URL is not set. Add it to .env.local.");
  }

  const onRailway = Boolean(
    process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_ID,
  );

  if (!onRailway && /railway\.internal/i.test(url)) {
    fail(
      [
        "Your DATABASE_URL uses postgres.railway.internal — that only works inside Railway.",
        "For migrations from your laptop:",
        "  1. Open Railway → Postgres service → Connect",
        "  2. Copy the PUBLIC / external URL (TCP proxy, not internal)",
        "  3. Put it in .env.local as DATABASE_URL",
        "",
        "Keep the internal URL on the Railway web service (faster in production).",
      ].join("\n"),
    );
  }

  const pool = createPgPool();
  try {
    await pool.query("select 1");
    console.log("✓ Database connection OK");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(
      [
        `Could not connect to Postgres: ${message}`,
        "Check that DATABASE_URL is correct and the DB is running.",
        "Railway public URLs need SSL — the app handles this automatically.",
      ].join("\n"),
    );
  } finally {
    await pool.end();
  }

  console.log("→ Running migrations...\n");
  execSync("drizzle-kit migrate", { stdio: "inherit" });
}

void main();
