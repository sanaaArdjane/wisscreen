/**
 * Human-facing reference codes: `WC-2609-0042`, `DV-2609-0007`, `FA-2609-0011`.
 *
 * The counter is **per prefix, per month**, taken from the highest existing ref
 * in that month rather than from a sequence — so the codes stay contiguous and
 * readable, and there is no extra table to keep in step with the rows.
 *
 * Two of these can collide under concurrent inserts; the unique index on `ref`
 * is what actually guarantees uniqueness, and the caller retries.
 * ponytail: read-max + unique-index retry. Move to a Postgres sequence per
 * prefix if the desk ever creates these faster than one at a time.
 */

export type RefPrefix = "WC" | "DV" | "FA";

export function refPeriod(date = new Date()): string {
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${yy}${mm}`;
}

export function buildRef(prefix: RefPrefix, sequence: number, date = new Date()): string {
  return `${prefix}-${refPeriod(date)}-${String(sequence).padStart(4, "0")}`;
}

/** The numeric tail of a ref, or 0 if it isn't one of ours. */
export function refSequence(ref: string): number {
  const m = /^[A-Z]{2}-\d{4}-(\d{4})$/.exec(ref);
  return m ? Number(m[1]) : 0;
}

/** Given this month's existing refs, the next one. */
export function nextRef(prefix: RefPrefix, existing: string[], date = new Date()): string {
  const period = refPeriod(date);
  const highest = existing
    .filter((r) => r.startsWith(`${prefix}-${period}-`))
    .reduce((max, r) => Math.max(max, refSequence(r)), 0);
  return buildRef(prefix, highest + 1, date);
}
