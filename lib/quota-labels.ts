/**
 * Quota and subscription vocabulary — labels, statuses, tones.
 *
 * Deliberately free of any database import: client components (the catalogue
 * and service forms) render these, and `lib/quotas.ts` imports `db`, which
 * would drag `pg` into the browser bundle. Server code can keep importing from
 * `lib/quotas`, which re-exports all of this.
 */

/**
 * The metrics the admin UI offers. Free text is still accepted everywhere —
 * `describe()` falls back to the raw key — so metering a new service is a line
 * here, not a migration. `storage.*` and `bandwidth.*` prefixes matter: a
 * `storage.` metric is a standing total and never resets.
 */
export const METRIC_LABELS: Record<string, string> = {
  "smtp.emails": "Envois SMTP",
  "ai.requests": "Requêtes IA",
  "ai.tokens": "Jetons IA",
  "sms.messages": "SMS envoyés",
  "storage.mb": "Stockage (Mo)",
  "bandwidth.gb": "Bande passante (Go)",
  "demo.processing": "Traitements de démo",
};

/** A storage allowance is a standing total, not a monthly budget. */
export function isStandingMetric(metric: string): boolean {
  return metric.startsWith("storage.");
}

export const SUBSCRIPTION_STATUSES = ["pending", "provisioning", "active", "suspended", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SUBSCRIPTION_LABELS: Record<string, string> = {
  pending: "En attente",
  provisioning: "Mise en service",
  active: "Actif",
  suspended: "Suspendu",
  cancelled: "Résilié",
  // Legacy values from the platform-tier model.
  trialing: "Essai",
  past_due: "Impayé",
  paused: "Suspendu",
};

export const SUBSCRIPTION_TONE: Record<string, string> = {
  pending: "bg-fg/5 text-fg border-fg/15",
  provisioning: "bg-signal/15 text-fg border-signal/45",
  active: "bg-teal/15 text-fg border-teal/40",
  suspended: "bg-fg text-on-fg border-fg",
  cancelled: "bg-fg/5 text-fg border-fg/15",
};

export const CATEGORY_LABELS: Record<string, string> = {
  infrastructure: "Infrastructure",
  addon: "Service à la consommation",
  support: "Accompagnement",
};

export const PERIOD_LABELS: Record<string, string> = {
  monthly: "/ mois",
  yearly: "/ an",
  one_off: "une fois",
};
