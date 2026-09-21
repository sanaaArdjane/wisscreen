"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * The browser half of the live feed: one `EventSource` per tab, the bell's
 * count, and the toasts.
 *
 * On every event it does two things, and deliberately nothing cleverer:
 *
 * 1. fetches `/api/notifications` for the real count and the newest rows, and
 *    toasts any it hasn't shown yet;
 * 2. calls `router.refresh()`, debounced, so whatever server component is on
 *    screen — an open thread, the demandes list, the admin home counters —
 *    re-renders with the new data.
 *
 * Refreshing on *every* event rather than matching the event's entity against
 * the current route is on purpose. A route-matching table is one more thing to
 * keep in sync with every page that gets added, and a missed entry is a page
 * that silently stops being live. `router.refresh()` keeps client state — a
 * half-typed reply survives it — so the only cost is a cheap RSC round trip.
 */

type Toast = { id: number; title: string; body?: string | null; href?: string | null };

type LatestRow = {
  id: number;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
};

const RealtimeContext = createContext<{ unread: number; connected: boolean }>({
  unread: 0,
  connected: false,
});

export function useRealtime() {
  return useContext(RealtimeContext);
}

/** Toasts stay long enough to read a title twice. */
const TOAST_MS = 6_000;
const REFRESH_DEBOUNCE_MS = 400;

export function RealtimeProvider({
  initialUnread,
  children,
}: {
  /** The server-rendered count — the first paint is right before any stream opens. */
  initialUnread: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [unread, setUnread] = useState(initialUnread);
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // The highest notification id this tab has already accounted for. Starts
  // unknown: the first fetch only *records* the newest id and toasts nothing,
  // otherwise opening a tab would replay the last five notifications at you.
  const seenRef = useRef<number | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // A navigation re-renders the layout with a fresh server count (e.g. after
  // "tout marquer comme lu"); adopt it — the server is the authority.
  const [lastInitial, setLastInitial] = useState(initialUnread);
  if (lastInitial !== initialUnread) {
    setLastInitial(initialUnread);
    setUnread(initialUnread);
  }

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id));
  }, []);

  const sync = useCallback(
    async (toast: boolean) => {
      try {
        const res = await fetch("/api/notifications", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { unread: number; latest: LatestRow[] };
        setUnread(data.unread);

        const newest = data.latest.reduce((max, n) => Math.max(max, n.id), 0);
        if (seenRef.current === null) {
          seenRef.current = newest;
          return;
        }
        const seen = seenRef.current;
        const fresh = data.latest.filter((n) => n.id > seen && !n.read).reverse();
        seenRef.current = Math.max(seen, newest);
        if (!toast || fresh.length === 0) return;

        setToasts((all) => [...all, ...fresh.map((n) => ({ id: n.id, title: n.title, body: n.body, href: n.href }))].slice(-3));
        for (const n of fresh) setTimeout(() => dismiss(n.id), TOAST_MS);
      } catch {
        /* offline, or the tab is being torn down — the next event retries */
      }
    },
    [dismiss],
  );

  const refreshSoon = useCallback(() => {
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
  }, [router]);

  useEffect(() => {
    const source = new EventSource("/api/realtime", { withCredentials: true });
    // On every (re)connect, re-baseline: record the newest id without toasting,
    // so a reconnect after a sleep doesn't replay what arrived while it was down
    // as if it were new — the refresh on visibility already shows it.
    source.onopen = () => {
      setConnected(true);
      seenRef.current = null;
      void sync(false);
    };
    // EventSource reconnects on its own; this only drives the status dot.
    source.onerror = () => setConnected(false);
    source.addEventListener("unread", (e) => {
      try {
        setUnread((JSON.parse((e as MessageEvent).data) as { unread: number }).unread);
      } catch {
        /* malformed frame — ignore it, the next one will do */
      }
    });
    source.addEventListener("change", () => {
      void sync(true);
      refreshSoon();
    });

    // A laptop lid closed for an hour drops the stream and every event with
    // it. Coming back to the tab is exactly when the person looks, so catch up
    // then rather than waiting for the next event to happen to arrive.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void sync(false);
      refreshSoon();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      source.close();
      document.removeEventListener("visibilitychange", onVisible);
      clearTimeout(refreshTimer.current);
    };
  }, [sync, refreshSoon]);

  return (
    <RealtimeContext.Provider value={{ unread, connected }}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismiss} />
    </RealtimeContext.Provider>
  );
}

function ToastStack({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    // `aria-live="polite"` so a screen reader announces a new notification the
    // way a sighted person notices the toast, without interrupting them.
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="pointer-events-auto flex items-start gap-3 rounded-2xl border border-fg/15 bg-panel p-4 shadow-lg"
        >
          <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-signal" />
          <div className="min-w-0 flex-1">
            {t.href ? (
              <Link
                href={t.href}
                onClick={() => onDismiss(t.id)}
                className="block text-sm font-[650] text-fg hover:underline"
              >
                {t.title}
              </Link>
            ) : (
              <p className="text-sm font-[650] text-fg">{t.title}</p>
            )}
            {t.body && <p className="mt-0.5 line-clamp-2 text-xs text-fg/80">{t.body}</p>}
          </div>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="rounded-full p-1 text-fg/80 hover:bg-fg/8"
            aria-label="Fermer"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

/** The bell's badge, reading the live count. */
export function UnreadBadge() {
  const { unread } = useRealtime();
  if (unread <= 0) return null;
  return (
    <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-signal px-1 text-[10px] font-[650] text-abyss">
      {unread > 99 ? "99+" : unread}
    </span>
  );
}
