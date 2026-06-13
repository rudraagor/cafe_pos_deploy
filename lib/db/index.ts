import { drizzle } from "drizzle-orm/node-postgres";
import { createPgPool } from "./connection";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { pool?: ReturnType<typeof createPgPool> };

const pool = globalForDb.pool ?? createPgPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
