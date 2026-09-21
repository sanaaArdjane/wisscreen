import { Client } from "pg";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

/**
 * Live server→client events, over Postgres `LISTEN/NOTIFY`.
 *
 * The platform used to say "no realtime: threads and notifications refresh on
 * navigation", which meant a client could file a demande and nothing appeared
 * on the desk's screen until someone happened to click something. This is the
 * transport that fixes it.
 *
 * **Why Postgres and not an in-process `EventEmitter`.** An emitter is fewer
 * lines and works perfectly on one container — which is exactly what this ships
 * as today. It breaks silently the day there are two: the admin's browser is
 * connected to container A, the client's write lands on container B, and the
 * notification simply never arrives. Nothing errors. Postgres is already the one
 * thing both containers share, and `NOTIFY` costs a statement.
 *
 * **The payload is a pointer, never content.** `NOTIFY` caps at 8000 bytes, and
 * more importantly this channel carries no authorization of its own — so it says
 * "notification 412 exists for user X", and the receiving stream, which has
 * already authenticated, decides what that person may see. Nothing private
 * crosses it.
 */

export type RealtimeEvent = {
  /** What happened. `notification` is the bell; the rest let an open page
   *  decide whether to refresh itself without refetching first. */
  kind: "notification" | "message" | "request" | "quote" | "invoice" | "demo" | "subscription";
  /** The row this is about, when there is one. */
  entity?: string;
  entityId?: string;
  /** Present on `kind: "notification"` — the row in `notifications`. */
  id?: number;
  at: number;
};

/** One channel per account. Postgres channel names are identifiers, so the
 *  user id — a cuid-ish string — is quoted rather than interpolated raw. */
export function channelFor(userId: string): string {
  return `wicloud_user_${userId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

/* ───────────────────────────────── Publish ───────────────────────────────── */

/**
 * Fire an event at one account. Never throws: a notification that was written
 * to the database has already happened, and failing the caller's action because
 * the live nudge didn't go out would be strictly worse than the nudge being
 * late. The row is the truth; this is the doorbell.
 */
export async function publish(
  userId: string,
  event: Omit<RealtimeEvent, "at">,
): Promise<void> {
  try {
    const payload = JSON.stringify({ ...event, at: Date.now() });
    await db.execute(sql`select pg_notify(${channelFor(userId)}, ${payload})`);
  } catch (error) {
    console.warn("[realtime] publish failed", error);
  }
}

/** The broadcast form. One `pg_notify` per recipient, in one round trip. */
export async function publishMany(
  userIds: string[],
  event: Omit<RealtimeEvent, "at">,
): Promise<void> {
  if (userIds.length === 0) return;
  try {
    const payload = JSON.stringify({ ...event, at: Date.now() });
    const channels = sql.join(
      Array.from(new Set(userIds)).map((id) => sql`(${channelFor(id)})`),
      sql`, `,
    );
    await db.execute(sql`select pg_notify(c, ${payload}) from (values ${channels}) as t(c)`);
  } catch (error) {
    console.warn("[realtime] publishMany failed", error);
  }
}

/* ──────────────────────────────── Subscribe ──────────────────────────────── */

type Listener = (event: RealtimeEvent) => void;

/** userId → the open SSE streams for that account (several tabs is normal). */
const listeners = new Map<string, Set<Listener>>();

let client: Client | undefined;
let connecting: Promise<void> | undefined;
let retryDelay = 1_000;

/**
 * The `LISTEN` connection is its own `pg.Client`, deliberately **not** from the
 * pool in `lib/db/index.ts`. A connection with a `LISTEN` registered can never
 * be handed back to a pool — the next borrower would silently inherit its
 * notifications — so taking one of the pool's ten would mean permanently
 * losing it.
 *
 * Built lazily on the first subscriber, for the same reason the pool is lazy:
 * CI runs `pnpm build` with no `DATABASE_URL`, and a client constructed at
 * module scope would fail the build the moment any route imported this file.
 */
async function ensureClient(): Promise<void> {
  if (client) return;
  if (connecting) return connecting;

  connecting = (async () => {
    // The **direct** endpoint, not the pooled one. `DATABASE_URL` is Neon's
    // PgBouncer endpoint in transaction mode, which hands the server connection
    // back after every statement — so a `LISTEN` registers on a connection this
    // client no longer owns, and notifications silently never arrive. Measured:
    // zero deliveries through the pooler, all of them through the direct URL.
    // `NOTIFY` itself (in `publish`) is fine through the pool; it only needs to
    // commit. The same split the migrations already make, for the same reason.
    const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED is not set.");

    const next = new Client({ connectionString });
    next.on("notification", (msg) => {
      if (!msg.payload) return;
      const set = listeners.get(channelToUser(msg.channel));
      if (!set || set.size === 0) return;
      let event: RealtimeEvent;
      try {
        event = JSON.parse(msg.payload) as RealtimeEvent;
      } catch {
        return;
      }
      for (const fn of set) {
        // One subscriber throwing must not cost the others their event.
        try {
          fn(event);
        } catch (error) {
          console.warn("[realtime] listener threw", error);
        }
      }
    });

    // A dropped connection is normal — Neon closes idle ones, and a deploy
    // restarts Postgres-side. Drop the client and let the next `ensureClient`
    // rebuild it, re-issuing every LISTEN the live subscribers still need.
    const drop = () => {
      client = undefined;
      connecting = undefined;
      if (listeners.size > 0) {
        const delay = retryDelay;
        retryDelay = Math.min(retryDelay * 2, 30_000);
        setTimeout(() => void resubscribeAll(), delay);
      }
    };
    next.on("error", (error) => {
      console.warn("[realtime] listener connection error", error);
      drop();
    });
    next.on("end", drop);

    await next.connect();
    client = next;
    retryDelay = 1_000;
  })();

  try {
    await connecting;
  } finally {
    connecting = undefined;
  }
}

/** The channel→user direction of `channelFor`. Exact, because the map is keyed
 *  by the *sanitised* name, not by the raw user id. */
const channelOwner = new Map<string, string>();
function channelToUser(channel: string): string {
  return channelOwner.get(channel) ?? "";
}

async function resubscribeAll(): Promise<void> {
  try {
    await ensureClient();
    for (const userId of listeners.keys()) {
      await client?.query(`LISTEN ${quoteIdent(channelFor(userId))}`);
    }
  } catch (error) {
    console.warn("[realtime] resubscribe failed", error);
  }
}

/** `LISTEN` takes an identifier, which cannot be parameterised. `channelFor`
 *  has already stripped everything but `[A-Za-z0-9_]`; this is the second line. */
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Subscribe one open stream to one account's events. Returns the unsubscribe,
 * which the SSE route calls from the request's `abort`.
 *
 * `UNLISTEN` only fires when the *last* stream for an account goes away — a
 * person with three tabs open is three subscribers on one channel.
 */
export async function subscribe(userId: string, onEvent: Listener): Promise<() => void> {
  const channel = channelFor(userId);
  channelOwner.set(channel, userId);

  let set = listeners.get(userId);
  if (!set) {
    set = new Set();
    listeners.set(userId, set);
  }
  set.add(onEvent);

  try {
    await ensureClient();
    await client?.query(`LISTEN ${quoteIdent(channel)}`);
  } catch (error) {
    // The stream still opens. It just carries heartbeats until the connection
    // comes back, which is a degraded live feed rather than a broken page.
    console.warn("[realtime] subscribe failed", error);
  }

  return () => {
    const current = listeners.get(userId);
    if (!current) return;
    current.delete(onEvent);
    if (current.size > 0) return;
    listeners.delete(userId);
    channelOwner.delete(channel);
    void client?.query(`UNLISTEN ${quoteIdent(channel)}`).catch(() => {});
  };
}
