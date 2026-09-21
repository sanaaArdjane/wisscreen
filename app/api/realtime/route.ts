import { unreadCount } from "@/lib/account";
import { getCurrentUser } from "@/lib/guard";
import { subscribe, type RealtimeEvent } from "@/lib/realtime";

/**
 * The live feed the dashboard's bell and open pages listen on.
 *
 * Server-sent events rather than a WebSocket: this is one-directional — the
 * server tells the browser something changed and the browser refetches through
 * the routes it already has. SSE needs no new dependency, no custom server (so
 * `output: "standalone"` keeps its plain `node server.js`), reconnects on its
 * own, and survives every proxy that speaks HTTP.
 *
 * `proxy.ts` matches only `/dashboard/*` and `/admin/*`, so nothing has checked
 * this request before it arrives. It authenticates itself — and answers **401,
 * never a redirect**: this is a `fetch`, and sending it to `/connexion` would
 * hand `EventSource` a 200 of HTML to parse forever.
 */

/** A dropped stream is cheap to rebuild, and holding one open for an hour is
 *  not. The client's `EventSource` reconnects without being told to. */
const MAX_LIFETIME_MS = 30 * 60 * 1000;
/** Long enough to be quiet, short enough that no proxy calls the connection
 *  idle. A comment line is a valid SSE frame that fires no event handler. */
const HEARTBEAT_MS = 25_000;

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || user.banned) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // During impersonation `getSession` returns the *impersonated* user, so the
  // admin's stream is that person's stream — which is what makes the client
  // space look real from the inside. Nothing extra to do for it.
  const userId = user.id;

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let lifetime: ReturnType<typeof setTimeout> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };
      const event = (name: string, data: unknown) =>
        send(`event: ${name}\ndata: ${JSON.stringify(data)}\n\n`);

      const shutdown = () => {
        if (closed) return;
        closed = true;
        unsubscribe?.();
        if (heartbeat) clearInterval(heartbeat);
        if (lifetime) clearTimeout(lifetime);
        try {
          controller.close();
        } catch {
          /* already closed by the client going away */
        }
      };

      // `retry` tells EventSource how long to wait before reconnecting; without
      // it the default is 3s and a restart stampedes every open tab at once.
      send("retry: 5000\n\n");

      // The badge has to be right the moment the stream opens, not at the first
      // event — otherwise a tab left open overnight shows a stale count until
      // something happens to arrive.
      try {
        event("unread", { unread: await unreadCount(userId) });
      } catch {
        /* the SSR-rendered count stands; this is a refinement, not the source */
      }

      try {
        unsubscribe = await subscribe(userId, (e: RealtimeEvent) => event("change", e));
      } catch (error) {
        console.warn("[realtime] could not subscribe", error);
      }

      heartbeat = setInterval(() => {
        if (closed) return;
        send(`: ping ${Date.now()}\n\n`);
      }, HEARTBEAT_MS);

      lifetime = setTimeout(shutdown, MAX_LIFETIME_MS);
      request.signal.addEventListener("abort", shutdown);
      if (request.signal.aborted) shutdown();
    },
    cancel() {
      unsubscribe?.();
      if (heartbeat) clearInterval(heartbeat);
      if (lifetime) clearTimeout(lifetime);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      // `no-transform` is the load-bearing half: a proxy that gzips this will
      // buffer it, and a buffered event stream is not an event stream.
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
