import { config } from "dotenv";
config({ path: ".env.local" });
import { Client } from "pg";
async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  try {
    await c.connect();
    const r = await c.query("select version()");
    console.log("OK:", r.rows[0].version);
    await c.end();
  } catch (e) {
    console.error("ERR:", (e as Error).message);
    process.exit(1);
  }
}
main();
