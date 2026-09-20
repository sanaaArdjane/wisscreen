import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/db/schema";

/**
 * The single Postgres pool, created **lazily**.
 *
 * CI runs `pnpm build` with no `DATABASE_URL` (see `.github/workflows/ci-cd.yml`)
 * and the Dockerfile deliberately passes no database build-arg — the connection
 * string is a runtime-only value. A pool constructed at module scope would throw
 * during the build the moment any dashboard route imported this file, so the
 * pool is built on first query instead and nothing touches it at build time.
 *
 * `node-postgres` rather than `@neondatabase/serverless`: this ships as a
 * long-lived Node server (`output: "standalone"`, one container), so a real TCP
 * pool against Neon's pooled endpoint beats per-request HTTP.
 */
let pool: Pool | undefined;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.example to .env.local and fill it in (`neon link` writes it for you).",
      );
    }
    pool = new Pool({
      connectionString,
      // Neon terminates idle connections itself; keep the local pool small so a
      // single container doesn't hold open more than its share of the endpoint.
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

type Db = ReturnType<typeof drizzle<typeof schema>>;
let instance: Db | undefined;

function getDb(): Db {
  if (!instance) instance = drizzle(getPool(), { schema });
  return instance;
}

/**
 * A Proxy so `db` can be imported at module scope everywhere without connecting —
 * the pool and the drizzle instance are both built on the first property access,
 * which is the first query.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDb();
    return Reflect.get(real, prop, real);
  },
});

export { schema };
