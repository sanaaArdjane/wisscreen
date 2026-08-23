"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { gsap } from "@/lib/gsap";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

export interface AccordionItem {
  title: string;
  content: ReactNode;
}

export function Accordion({
  items,
  className,
  defaultOpen = 0,
}: {
  items: AccordionItem[];
  className?: string;
  defaultOpen?: number | null;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpen);
  const panelRefs = useRef<Array<HTMLDivElement | null>>([]);

  const toggle = (index: number) => {
    const isOpening = openIndex !== index;
    const closingIndex = openIndex;
    setOpenIndex(isOpening ? index : null);

    if (closingIndex !== null && closingIndex !== index) {
      const closingPanel = panelRefs.current[closingIndex];
      if (closingPanel) gsap.to(closingPanel, { height: 0, duration: 0.4, ease: "power2.inOut" });
    }

    const panel = panelRefs.current[index];
    if (!panel) return;
    if (isOpening) {
      gsap.set(panel, { height: "auto" });
      const full = panel.offsetHeight;
      gsap.fromTo(panel, { height: 0 }, { height: full, duration: 0.45, ease: "power2.inOut" });
    } else {
      gsap.to(panel, { height: 0, duration: 0.4, ease: "power2.inOut" });
    }
  };

  return (
    <div className={cn("divide-y divide-current/12", className)}>
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.title}>
            <button
              type="button"
              onClick={() => toggle(index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-6 py-6 text-left"
            >
              <span className="text-lg font-medium md:text-xl">{item.title}</span>
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/25 transition-transform duration-300",
                  isOpen && "rotate-45 border-aqua text-aqua",
                )}
              >
                <Icon name="arrow-right" className="h-4 w-4 rotate-[-45deg]" strokeWidth={2} />
              </span>
            </button>
            <div
              ref={(node) => {
                panelRefs.current[index] = node;
              }}
              style={{ height: isOpen ? "auto" : 0 }}
              className="overflow-hidden"
            >
              <div className="pb-6 pr-14 text-base leading-relaxed opacity-70">{item.content}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
