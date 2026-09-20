import type { MoneyLine } from "@/lib/db/schema";

/**
 * Money helpers. Everything is integer **cents** end to end — the only place a
 * decimal appears is the string this file formats for display.
 */

export function lineTotalCents(line: MoneyLine): number {
  return Math.round(line.quantity * line.unitCents);
}

export function totalCents(lines: MoneyLine[]): number {
  return lines.reduce((sum, l) => sum + lineTotalCents(l), 0);
}

/**
 * `Intl` with an explicit `fr-DZ`-style grouping. Currency is passed in rather
 * than assumed, because a quote carries its own.
 */
export function formatMoney(cents: number, currency = "DZD"): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Parses what a human typed into a price field ("1 250,50", "1250.5") into cents. */
export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}
