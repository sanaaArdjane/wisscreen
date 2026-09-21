"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribe = (onChange: () => void) => {
  const q = window.matchMedia(REDUCE_MOTION_QUERY);
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
};

/**
 * A muted looping clip that only plays while it is on screen.
 *
 * - `muted` is also set imperatively: React does not render it as an attribute during
 *   SSR, and autoplay policies check the property, so the first `play()` would
 *   otherwise be refused (same fix as UniverseReveal).
 * - `preload="metadata"` + a poster: nothing but the first frame's worth of bytes
 *   until the video is actually wanted.
 * - A pause control, because moving content that lasts more than five seconds needs
 *   one (WCAG 2.2.2). Reduced motion starts it paused; the button still plays it.
 */
export function HeroVideo({
  src,
  poster,
  active = true,
  className,
}: {
  src: string;
  poster?: string;
  /** In a carousel, only the visible slide plays. */
  active?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduceMotion = useSyncExternalStore(subscribe, () => window.matchMedia(REDUCE_MOTION_QUERY).matches, () => false);
  const [override, setOverride] = useState<boolean | null>(null);
  const [inView, setInView] = useState(false);
  const playing = override ?? !reduceMotion;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    const observer = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), {
      threshold: 0.2,
    });
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (playing && inView && active) video.play().catch(() => {});
    else video.pause();
  }, [playing, inView, active]);

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={poster || undefined}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
        tabIndex={-1}
        className={className ?? "absolute inset-0 h-full w-full object-cover"}
      />
      {active && (
        <button
          type="button"
          onClick={() => setOverride(!playing)}
          aria-label={playing ? "Mettre la vidéo en pause" : "Lire la vidéo"}
          className="absolute bottom-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-abyss/70 text-paper backdrop-blur transition-colors hover:border-aqua"
        >
          {playing ? (
            <span className="flex gap-1" aria-hidden="true">
              <span className="h-3.5 w-1 rounded-sm bg-current" />
              <span className="h-3.5 w-1 rounded-sm bg-current" />
            </span>
          ) : (
            <Icon name="chevron-right" className="h-5 w-5" />
          )}
        </button>
      )}
    </>
  );
}
