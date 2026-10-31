"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Generic scroll-reveal wrapper. If descendants are marked with [data-reveal-item],
 * they animate in with a stagger; otherwise the wrapper itself animates as one block.
 * Content renders fully visible server-side (SEO / no-JS safe) — the hidden state is
 * applied imperatively on mount, client-only, right before animating in.
 *
 * **This used GSAP + ScrollTrigger, and that was the single most expensive import on
 * the public site.** Not because of this component — because `SectionHeading` wraps
 * itself in a `Reveal`, twenty-one sections use `SectionHeading`, and `Reveal` is a
 * client boundary. GSAP therefore landed in the main bundle of every marketing page,
 * statically, to fade some headings in. An IntersectionObserver and two CSS properties
 * do the same job with nothing to download.
 *
 * GSAP is still the right tool where the repo actually scrubs an animation against
 * scroll position — `UniverseReveal`, `DeviceShowcase`, `SolutionVideoReveal` — and it
 * stays there. A one-shot fade is not that.
 *
 * Two details worth keeping:
 *  - **`useLayoutEffect`, not `useEffect`.** The server sends the content visible; the
 *    hidden state has to be in place before the browser paints, or every reveal flashes
 *    its final state first. That is also why the styles are set imperatively rather than
 *    via a class toggled in state.
 *  - **Reduced motion leaves the server-rendered state alone.** No hiding, no observer:
 *    the content is simply already there, which is what the preference asks for. The
 *    GSAP version ignored this.
 */
export function Reveal({
  children,
  className,
  y = 32,
  delay = 0,
  stagger = 0.1,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  stagger?: number;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const items = el.querySelectorAll<HTMLElement>("[data-reveal-item]");
    const targets: HTMLElement[] = items.length ? Array.from(items) : [el];

    targets.forEach((target, index) => {
      const wait = delay + index * stagger;
      target.style.opacity = "0";
      target.style.transform = `translateY(${y}px)`;
      // power3.out ≈ cubic-bezier(0.16, 1, 0.3, 1); same 1s duration as before.
      target.style.transition =
        `opacity 1s cubic-bezier(0.16, 1, 0.3, 1) ${wait}s,` +
        `transform 1s cubic-bezier(0.16, 1, 0.3, 1) ${wait}s`;
      target.style.willChange = "opacity, transform";
    });

    const paint = (shown: boolean) => {
      for (const target of targets) {
        target.style.opacity = shown ? "1" : "0";
        target.style.transform = shown ? "none" : `translateY(${y}px)`;
      }
    };

    /* `-18%` on the bottom edge is ScrollTrigger's `start: "top 82%"`, expressed the
       way IntersectionObserver spells it: fire once the element's top has passed 82%
       of the viewport height. */
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            paint(true);
            if (once) observer.disconnect();
          } else if (!once) {
            paint(false);
          }
        }
      },
      { rootMargin: "0px 0px -18% 0px" },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      for (const target of targets) {
        target.style.opacity = "";
        target.style.transform = "";
        target.style.transition = "";
        target.style.willChange = "";
      }
    };
  }, [y, delay, stagger, once]);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
