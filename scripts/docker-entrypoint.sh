#!/bin/sh
set -e

echo "→ Waiting for Postgres..."
until node --input-type=module -e "
import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  await pool.query('select 1');
  await pool.end();
  process.exit(0);
} catch {
  await pool.end().catch(() => {});
  process.exit(1);
}
" 2>/dev/null; do
  sleep 2
done

echo "→ Running migrations..."
pnpm db:migrate

echo "→ Starting Next.js..."
exec pnpm start
