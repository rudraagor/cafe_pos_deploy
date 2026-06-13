import { defineConfig } from "drizzle-kit";
import { loadLocalEnv } from "./lib/db/load-env";
import { needsPgSsl } from "./lib/db/connection";

loadLocalEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Add it to .env.local or Railway variables.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dbCredentials: {
    url: databaseUrl,
    ssl: needsPgSsl(databaseUrl) ? "require" : undefined,
  },
});
