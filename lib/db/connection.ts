import { Pool, type PoolConfig } from "pg";

export function needsPgSsl(connectionString?: string) {
  if (!connectionString) return false;
  if (/sslmode=(require|verify-full|no-verify)/i.test(connectionString)) {
    return true;
  }
  return /railway\.(app|internal)|neon\.tech|supabase\.co|render\.com/i.test(
    connectionString,
  );
}

export function getPgPoolConfig(
  connectionString = process.env.DATABASE_URL,
): PoolConfig {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  return {
    connectionString,
    ssl: needsPgSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  };
}

export function createPgPool(connectionString?: string) {
  return new Pool(getPgPoolConfig(connectionString));
}
