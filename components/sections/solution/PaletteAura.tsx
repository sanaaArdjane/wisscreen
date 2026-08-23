"use client";

import { useLayoutEffect, useRef } from "react";
import type { PaletteToken } from "@/lib/types";
import { paletteBg } from "@/lib/palette";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/cn";

export function PaletteAura({ primary, secondary }: { primary: PaletteToken; secondary: PaletteToken }) {
  const primaryRef = useRef<HTMLDivElement>(null);
  const secondaryRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.to(primaryRef.current, {
        x: 60,
        y: -40,
        duration: 9,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(secondaryRef.current, {
        x: -50,
        y: 50,
        duration: 11,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 0.5,
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div ref={primaryRef} className={cn("absolute -left-24 top-0 h-[26rem] w-[26rem] rounded-full opacity-25 blur-3xl", paletteBg[primary])} />
      <div ref={secondaryRef} className={cn("absolute -right-16 bottom-0 h-[22rem] w-[22rem] rounded-full opacity-20 blur-3xl", paletteBg[secondary])} />
      <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:26px_26px]" />
    </div>
  );
}
