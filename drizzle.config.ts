import { defineConfig } from "drizzle-kit";

/**
 * Env comes from Node's own `--env-file=.env.local` in the `db:*` scripts, not
 * from `dotenv` — one less dependency for a thing the runtime already does.
 * `.env.local` is written by `neon link` / `neon deploy` and is gitignored.
 */

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  // The unpooled endpoint: DDL through PgBouncer's transaction pooling is a
  // known source of "prepared statement already exists" on repeated migrations.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL! },
});
