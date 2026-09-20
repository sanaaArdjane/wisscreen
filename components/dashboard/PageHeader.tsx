import type { ReactNode } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

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
    <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="mb-2 inline-flex items-center gap-1.5 text-sm text-ink/80 transition-colors hover:text-ink"
          >
            <Icon name="arrow-right" className="size-4 rotate-180" />
            {backLabel}
          </Link>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-sm text-ink/80">{description}</p>}
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
        "overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-[0_1px_2px_rgba(38,51,76,0.04)]",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-ink/80">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * A KPI tile. `tone="accent"` gives one tile in a row the signal edge — the same
 * rule the marketing `HighlightsReel` follows: exactly one accented tile between
 * cool ones, so the row has a focal point instead of a wall of green.
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
        <p className="text-sm text-ink/80">{label}</p>
        {icon && (
          <Icon
            name={icon}
            className={cn("size-5", tone === "accent" ? "text-signal-deep" : "text-steel")}
          />
        )}
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink/80">{hint}</p>}
    </>
  );

  const className = cn(
    "block rounded-2xl border bg-paper p-5 transition-colors",
    tone === "accent" ? "border-signal/55" : "border-ink/10",
    href && "hover:border-ink/25",
  );

  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
