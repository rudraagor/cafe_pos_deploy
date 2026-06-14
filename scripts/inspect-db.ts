import { loadLocalEnv } from "../lib/db/load-env";
import { createPgPool } from "../lib/db/connection";

loadLocalEnv();

async function main() {
  const pool = createPgPool();
  const products = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name='products' ORDER BY ordinal_position",
  );
  console.log("products:", products.rows.map((r) => r.column_name).join(", "));

  const migrations = await pool.query(
    "SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at",
  );
  console.log("migration count:", migrations.rows.length);

  const enums = await pool.query(
    "SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='order_status' ORDER BY e.enumsortorder",
  );
  console.log("order_status:", enums.rows.map((r) => r.enumlabel).join(", "));

  const counts = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM users) AS users,
      (SELECT count(*)::int FROM products) AS products,
      (SELECT count(*)::int FROM categories) AS categories
  `);
  console.log("row counts:", counts.rows[0]);

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
