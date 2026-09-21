/**
 * The request lifecycle, as data rather than as scattered `if`s.
 *
 * Every status change goes through `canTransition()`. Without it "terminée" was
 * reachable from "refusée" and a closed request could be silently reopened by a
 * stale form post — the guard lives here so both the admin action and any future
 * API path share one answer.
 */

export const REQUEST_STATUSES = [
  "nouvelle",
  "en_cours",
  "acceptee",
  "refusee",
  "terminee",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const REQUEST_TYPES = ["service", "demo", "devis", "support"] as const;
export type RequestType = (typeof REQUEST_TYPES)[number];

export const REQUEST_PRIORITIES = ["basse", "normale", "haute", "urgente"] as const;
export type RequestPriority = (typeof REQUEST_PRIORITIES)[number];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  nouvelle: "Nouvelle",
  en_cours: "En cours",
  acceptee: "Acceptée",
  refusee: "Refusée",
  terminee: "Terminée",
};

export const TYPE_LABELS: Record<RequestType, string> = {
  service: "Demande de service",
  demo: "Demande de démo",
  devis: "Demande de devis",
  support: "Support",
};

export const PRIORITY_LABELS: Record<RequestPriority, string> = {
  basse: "Basse",
  normale: "Normale",
  haute: "Haute",
  urgente: "Urgente",
};

/** Where each status can go next. Terminal states have no exits. */
const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  nouvelle: ["en_cours", "acceptee", "refusee"],
  en_cours: ["acceptee", "refusee", "terminee"],
  acceptee: ["en_cours", "terminee"],
  refusee: [],
  terminee: [],
};

export function nextStatuses(from: RequestStatus): RequestStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(from: string, to: string): boolean {
  if (!isRequestStatus(from) || !isRequestStatus(to)) return false;
  return TRANSITIONS[from].includes(to);
}

export function isRequestStatus(value: string): value is RequestStatus {
  return (REQUEST_STATUSES as readonly string[]).includes(value);
}

/** A request nobody has to act on any more. Drives the admin queue's default filter. */
export function isClosed(status: string): boolean {
  return status === "refusee" || status === "terminee";
}

/** Tailwind classes per status, in the site's cool palette + the one signal accent. */
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
export const STATUS_TONE: Record<RequestStatus, string> = {
  nouvelle: "bg-signal/15 text-fg border-signal/45",
  en_cours: "bg-steel/15 text-fg border-steel/40",
  acceptee: "bg-teal/15 text-fg border-teal/40",
  refusee: "bg-fg/10 text-fg border-fg/20",
  terminee: "bg-fg/5 text-fg border-fg/15",
};
