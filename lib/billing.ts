/** Status vocabularies and tones for quotes and invoices, in one place. */

export const QUOTE_STATUSES = ["brouillon", "envoye", "accepte", "refuse", "expire"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_LABELS: Record<QuoteStatus, string> = {
  brouillon: "Brouillon",
  envoye: "En attente de réponse",
  accepte: "Accepté",
  refuse: "Refusé",
  expire: "Expiré",
};

/*
 * Chip tones: a tinted fill and a coloured border carry the identity, and the
 * **label stays `ink`**.
 *
 * The obvious version — `text-signal-fg` on `bg-signal/15`, `text-teal-deep`
 * on `bg-teal/10` — measures 4.46:1 and 4.37:1 at 12px, both under the floor.
 * The brand's accents are mid-tones with almost no margin on light grounds
 * (AGENTS.md has the table), and a tint behind them spends what is left. There
 * is no darker green or teal in the palette to reach for, so the colour moves
 * to the fill and the border, where only 3:1 is required, and the text is the
 * one value that is legible on every one of them.
 */
export const QUOTE_TONE: Record<QuoteStatus, string> = {
  brouillon: "bg-fg/5 text-fg border-fg/15",
  envoye: "bg-signal/15 text-fg border-signal/45",
  accepte: "bg-teal/15 text-fg border-teal/40",
  refuse: "bg-fg/10 text-fg border-fg/20",
  expire: "bg-fg/5 text-fg border-fg/15",
};

export const INVOICE_STATUSES = [
  "brouillon",
  "envoyee",
  "payee",
  "en_retard",
  "annulee",
] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_LABELS: Record<InvoiceStatus, string> = {
  brouillon: "Brouillon",
  envoyee: "À régler",
  payee: "Payée",
  en_retard: "En retard",
  annulee: "Annulée",
};

export const INVOICE_TONE: Record<InvoiceStatus, string> = {
  brouillon: "bg-fg/5 text-fg border-fg/15",
  envoyee: "bg-signal/15 text-fg border-signal/45",
  payee: "bg-teal/15 text-fg border-teal/40",
  en_retard: "bg-fg text-on-fg border-fg",
  annulee: "bg-fg/5 text-fg border-fg/15",
};

/**
 * A sent quote past its validity date.
 *
 * Derived, and derived *here* rather than in the page: a component that calls
 * `Date.now()` while rendering is impure (React's own lint rule catches it), and
 * this also keeps "expired" meaning the same thing on every screen that asks.
 */
export function isQuoteExpired(quote: { status: string; validUntil: Date | null }): boolean {
  return (
    quote.status === "envoye" &&
    quote.validUntil !== null &&
    quote.validUntil.getTime() < Date.now()
  );
}

export function isQuoteStatus(v: string): v is QuoteStatus {
  return (QUOTE_STATUSES as readonly string[]).includes(v);
}

export function isInvoiceStatus(v: string): v is InvoiceStatus {
  return (INVOICE_STATUSES as readonly string[]).includes(v);
}

/**
 * An invoice past its due date reads as "en retard" whatever the stored status
 * says. Derived rather than written by a cron: there is no job to forget to run,
 * and the answer is always current.
 */
export function effectiveInvoiceStatus(invoice: {
  status: string;
  dueAt: Date | null;
}): InvoiceStatus {
  const status = isInvoiceStatus(invoice.status) ? invoice.status : "brouillon";
  if (status === "envoyee" && invoice.dueAt && invoice.dueAt.getTime() < Date.now()) {
    return "en_retard";
  }
  return status;
}
