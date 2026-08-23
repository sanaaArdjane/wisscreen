"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { cn } from "@/lib/cn";

/**
 * Animates the leading number inside a stat string ("99,2%", "< 2 s", "-60%", "24/7")
 * counting up from 0 once it scrolls into view. Non-numeric values render statically.
 */
export function StatCounter({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const match = value.match(/-?\d+(?:[.,]\d+)?/);
    if (!match || match.index === undefined) return;

    const raw = match[0];
    const prefix = value.slice(0, match.index);
    const suffix = value.slice(match.index + raw.length);
    const decimalPart = raw.split(/[.,]/)[1];
    const decimals = decimalPart ? decimalPart.length : 0;
    const target = parseFloat(raw.replace(",", "."));
    const proxy = { n: 0 };

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 85%",
      once: true,
      onEnter: () => {
        gsap.to(proxy, {
          n: target,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => {
            const formatted = decimals > 0 ? proxy.n.toFixed(decimals).replace(".", ",") : Math.round(proxy.n).toString();
            el.textContent = `${prefix}${formatted}${suffix}`;
          },
        });
      },
    });

    return () => trigger.kill();
  }, [value]);

  return (
    <span ref={ref} className={cn(className)}>
      {value}
    </span>
  );
}
