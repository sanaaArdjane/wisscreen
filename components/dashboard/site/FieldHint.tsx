"use client";

import { Tooltip } from "@heroui/react";
import { Icon } from "@/components/ui/Icon";
import { whereHref, type Where } from "@/lib/content/forms";

const PAGE_LABEL: Record<Where["page"], string> = {
  home: "Page d'accueil",
  solution: "Page de la solution",
  everywhere: "Tout le site",
};

/**
 * The "where does this show up?" hint next to every field of /admin/site.
 *
 * Hover (or focus) the ⓘ for page › section › element and the recommended size; the
 * ↗ next to it opens that exact spot on the live site in a new tab — the section is
 * flashed on arrival (`section:target` in globals.css). Two separate controls because
 * a tooltip cannot hold a link: it closes as the pointer moves onto it.
 */
export function FieldHint({ where, slug }: { where: Where; slug?: string }) {
  const href = whereHref(where, slug);
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <Tooltip delay={150} closeDelay={80}>
        <Tooltip.Trigger
          aria-label={`Où ça s'affiche : ${where.section}`}
          className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full text-fg/80 ring-1 ring-fg/20 transition-colors hover:bg-fg/8 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
        >
          <span className="text-[11px] font-[650] leading-none">i</span>
        </Tooltip.Trigger>
        <Tooltip.Content showArrow placement="top" className="max-w-xs">
          <p className="text-[11px] font-[650] uppercase tracking-[0.1em] opacity-80">Où ça s&apos;affiche</p>
          <p className="mt-1 text-sm">
            {PAGE_LABEL[where.page]} › {where.section}
          </p>
          {where.detail && <p className="mt-0.5 text-sm opacity-90">{where.detail}</p>}
          {where.size && (
            <p className="mt-1.5 text-xs">
              <span className="font-[650]">Format conseillé :</span> {where.size}
            </p>
          )}
        </Tooltip.Content>
      </Tooltip>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Voir cet endroit sur le site (nouvel onglet)"
          title="Voir sur le site"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-fg/80 transition-colors hover:bg-fg/8 hover:text-fg"
        >
          <Icon name="external" className="h-3.5 w-3.5" />
        </a>
      )}
    </span>
  );
}
