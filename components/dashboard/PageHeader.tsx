import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

const sentence = (title: string) => (/[.!?…:]$/.test(title.trimEnd()) ? title : `${title}.`);

/**
 * The top of every dashboard page: an optional back link, the title, a line of
 * context, and the page's primary action on the right.
 *
 * A server component on purpose — it renders on every page and pulling a
 * `"use client"` boundary this high up would drag each page's header content
 * into the client bundle for nothing.
 */
export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Retour",
  actions,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-soft px-3.5 py-1.5 text-sm font-[650] text-fg transition-colors hover:bg-fg/8"
          >
            <Icon name="arrow-right" className="size-4 rotate-180" />
            {backLabel}
          </Link>
        )}
        {/* Sentence case with a terminal period — the spec's voice. `sentence()`
            leaves a title alone if it already ends in punctuation. */}
        <h1 className="text-2xl font-[650] leading-[1.1] text-fg sm:text-3xl">
          {sentence(title)}
        </h1>
        {description && (
          <p className="mt-3 max-w-2xl text-sm font-light leading-snug text-fg/80">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** A white panel. The dashboard's ground is `mist`, so content sits on `paper`. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border border-fg/10 bg-panel",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 pb-2 pt-5">
          <div className="min-w-0">
            {title && <h2 className="text-xl font-[650] leading-tight text-fg">{title}</h2>}
            {description && (
              <p className="mt-1 text-sm font-[450] text-fg/80">{description}</p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * A KPI tile: a level-1 `mist` fill, no border, no shadow. `tone="accent"` gives
 * one tile in a row the signal treatment — a filled `signal` icon squircle — so
 * the row has a single focal point instead of a wall of green. Per the spec the
 * featured surface is not outlined or polarity-flipped; only the icon chip moves.
 */
export function StatTile({
  label,
  value,
  hint,
  href,
  tone = "cool",
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  tone?: "cool" | "accent";
  icon?: Parameters<typeof Icon>[0]["name"];
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-[450] text-fg/80">{label}</p>
        {icon && (
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-[30%]",
              tone === "accent" ? "bg-signal text-abyss" : "bg-panel text-fg",
            )}
          >
            <Icon name={icon} className="size-5" />
          </span>
        )}
      </div>
      <p className="mt-3 text-3xl font-[650] leading-none tabular-nums text-fg">{value}</p>
      {hint && <p className="mt-2 text-xs font-[450] text-fg/80">{hint}</p>}
    </>
  );

  const className = cn(
    "block rounded-3xl bg-soft p-5 transition-colors",
    href && "hover:bg-fg/8",
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
