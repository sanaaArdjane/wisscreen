"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * The thread's scroll area: opens at the latest message, follows new ones as
 * they arrive over the live feed, and leaves the reader alone once they have
 * scrolled up into history — with a "nouveaux messages" button to come back.
 *
 * It also marks the other side's messages read, once per new batch, by calling
 * the server action it is handed. From an effect, not during render: a server
 * component must not write while rendering, and a read receipt for a page
 * that was prefetched but never shown would be a lie.
 */
const NEAR_BOTTOM_PX = 120;

export function ThreadViewport({
  count,
  onOpen,
  children,
}: {
  count: number;
  onOpen?: () => Promise<void>;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useRef(0);
  const pinned = useRef(true);
  const [behind, setBehind] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const first = seen.current === 0;
    if (first || pinned.current) {
      el.scrollTo({ top: el.scrollHeight, behavior: first ? "auto" : "smooth" });
    } else if (count > seen.current) {
      // Deferred a frame: this effect runs because `count` changed, and the
      // lint rule is right that a synchronous setState here cascades renders.
      requestAnimationFrame(() => setBehind(true));
    }
    seen.current = count;
  }, [count]);

  const hasUnread = Boolean(onOpen);
  const onOpenRef = useRef(onOpen);
  useEffect(() => {
    onOpenRef.current = onOpen;
  });
  useEffect(() => {
    if (!hasUnread || document.visibilityState !== "visible") return;
    void onOpenRef.current?.();
  }, [hasUnread, count]);

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
          if (pinned.current && behind) setBehind(false);
        }}
        className="max-h-[min(38rem,62svh)] overflow-y-auto overscroll-contain px-1 pb-4"
        // Announce new messages politely to screen readers as they arrive.
        aria-live="polite"
        aria-relevant="additions"
      >
        {children}
      </div>
      {behind && (
        <button
          type="button"
          onClick={() => {
            const el = ref.current;
            el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
            setBehind(false);
          }}
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-fg px-4 py-2 text-xs font-[650] text-on-fg shadow-lg"
        >
          <Icon name="chevron-down" className="size-3.5" />
          Nouveaux messages
        </button>
      )}
    </div>
  );
}
