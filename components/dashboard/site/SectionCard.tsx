"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/**
 * One homepage section in /admin/site/accueil. Collapsed by default, and its editor is
 * only mounted once opened: twenty-one full editors rendered up front would make the
 * page slow to become interactive for no benefit.
 */
export function SectionCard({
  index,
  title,
  summary,
  hidden,
  modified,
  anchor,
  children,
}: {
  index: number;
  title: string;
  summary: string;
  hidden: boolean;
  modified: boolean;
  anchor: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li id={`section-${anchor}`} className="scroll-mt-24 rounded-3xl bg-panel ring-1 ring-fg/10">
      <div className="flex items-center gap-3 p-4 sm:p-5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft font-mono text-xs font-[650] text-fg">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="flex flex-wrap items-center gap-2 text-base font-[650] text-fg">
              {title}
              {hidden && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-[650] text-fg ring-1 ring-fg/30">Masquée</span>
              )}
              {modified && (
                <span className="rounded-full bg-signal/15 px-2 py-0.5 text-[11px] font-[650] text-fg ring-1 ring-signal/45">
                  Modifiée
                </span>
              )}
            </span>
            <span className="truncate text-sm text-fg/80">{summary}</span>
          </span>
          <Icon name="chevron-down" className={cn("ml-auto h-5 w-5 shrink-0 text-fg transition-transform", open && "rotate-180")} />
        </button>
        <a
          href={`/#${anchor}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Voir « ${title} » sur le site`}
          title="Voir sur le site"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-fg hover:bg-fg/8"
        >
          <Icon name="external" className="h-4 w-4" />
        </a>
      </div>
      {open && <div className="border-t border-fg/10 p-4 sm:p-6">{children}</div>}
    </li>
  );
}
