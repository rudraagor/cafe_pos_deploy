import { loadLocalEnv } from "../lib/db/load-env";
import { createPgPool, needsPgSsl } from "../lib/db/connection";

loadLocalEnv();

const url = process.env.DATABASE_URL ?? "";

function redact(connectionString: string) {
  return connectionString.replace(/:([^:@/]+)@/, ":***@");
}

async function main() {
  if (!url) {
    console.error("DATABASE_URL is not set in .env.local");
    process.exit(1);
  }

  console.log("Host:", redact(url));
  console.log("SSL:", needsPgSsl(url));
  console.log("Railway internal URL:", /railway\.internal/i.test(url));

  const onRailway = Boolean(
    process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_SERVICE_ID,
  );

  if (!onRailway && /railway\.internal/i.test(url)) {
    console.error(
      "\nThis DATABASE_URL only works inside Railway, not from your laptop.",
    );
    console.error(
      "In Railway Postgres → Connect, use the PUBLIC / external URL instead.",
    );
    process.exit(1);
  }

  const pool = createPgPool();
  try {
    const result = await pool.query("select 1 as ok");
    console.log("Connection OK:", result.rows[0]);
  } catch (error) {
    console.error(
      "Connection FAILED:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  } finally {
    await pool.end();
  }
}

void main();
