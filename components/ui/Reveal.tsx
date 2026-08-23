"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { cn } from "@/lib/cn";

/**
 * Generic scroll-reveal wrapper. If descendants are marked with [data-reveal-item],
 * they animate in with a stagger; otherwise the wrapper itself animates as one block.
 * Content renders fully visible server-side (SEO / no-JS safe) — GSAP sets the hidden
 * state imperatively on mount, client-only, right before animating in.
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

    const ctx = gsap.context(() => {
      const items = el.querySelectorAll("[data-reveal-item]");
      const targets = items.length ? Array.from(items) : [el];

      gsap.set(targets, { opacity: 0, y });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 1,
        delay,
        stagger,
        ease: "power3.out",
        scrollTrigger: {
          trigger: el,
          start: "top 82%",
          once,
        },
      });
    }, el);

    return () => ctx.revert();
  }, [y, delay, stagger, once]);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}

export { gsap, ScrollTrigger };
