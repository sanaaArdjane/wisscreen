"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

/**
 * "Retour en haut": appears once the visitor is a screen or so down the page. The smooth
 * scroll and its reduced-motion opt-out come from `scroll-behavior` in globals.css, and
 * `html[data-immersive]` hides it with the header while a fullscreen overlay is up.
 */
export function ScrollTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      data-scroll-top
      aria-label="Retour en haut"
      title="Retour en haut"
      tabIndex={shown ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0 })}
      className={cn(
        "control-signal fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full transition-[opacity,transform] duration-300 md:bottom-8 md:right-8",
        shown ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <Icon name="arrow-up" className="h-5 w-5" />
    </button>
  );
}
