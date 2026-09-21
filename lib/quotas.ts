import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, quotas, subscriptions } from "@/lib/db/schema";

/**
 * Metered consumables — what WICLOUD provides and counts: SMTP sends, AI
 * requests, SMS, storage, bandwidth.
 *
 * These used to meter the *dashboard* itself (demandes per month, demo runs),
 * which rationed the one thing an agency wants more of: customers asking it
 * for work. A quota now exists because a provisioned service granted it —
 * see `grantServiceQuotas` — or because the desk set one by hand.
 *
 * Three rules the rest of the app relies on:
 *  - **A metric with no row, or a null limit, is unlimited.** A service that
 *    doesn't mention a metric simply doesn't meter it, rather than setting a
 *    magic sentinel number that someone later compares with `>=`.
 *  - **A limit of 0 means "not in your plan"** — a different message from
 *    "you've used it all", so the two are distinguishable at the call site.
 *  - **The period resets lazily.** There is no cron: `consume()` notices that
 *    `resetsAt` is in the past and zeroes the counter as part of the same
 *    statement. A container that was asleep all month behaves correctly on the
 *    first request after it wakes.
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

export type QuotaView = {
  metric: string;
  label: string;
  limit: number | null;
  used: number;
  resetsAt: Date | null;
  unlimited: boolean;
  included: boolean;
  remaining: number | null;
  ratio: number;
};

/** The first day of next month, UTC — when monthly counters roll over. */
export function nextPeriodReset(from = new Date()): Date {
  return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
}

export function describe(row: {
  metric: string;
  limit: number | null;
  used: number;
  resetsAt: Date | null;
}): QuotaView {
  const unlimited = row.limit === null;
  const included = unlimited || row.limit! > 0;
  const remaining = unlimited ? null : Math.max(0, row.limit! - row.used);
  return {
    ...row,
    label: METRIC_LABELS[row.metric] ?? row.metric,
    unlimited,
    included,
    remaining,
    ratio: unlimited || row.limit === 0 ? 0 : Math.min(1, row.used / row.limit!),
  };
}

export async function listQuotas(userId: string): Promise<QuotaView[]> {
  const rows = await db.select().from(quotas).where(eq(quotas.userId, userId));
  return rows.map(describe).sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

/**
 * Grant the quotas a catalogue service provides, when it is provisioned.
 *
 * **Upsert, never delete.** Its predecessor, `applyPlanQuotas`, deleted every
 * quota row for the account and re-inserted the plan's — correct when one plan
 * owned everything, destructive now that a customer holds several services: a
 * new SMS bundle would have wiped their SMTP allowance. Each metric granted
 * here is *added* to whatever limit the account already has, so two SMTP
 * services stack; `used` is never touched. A grant of `null` (unlimited)
 * wins over any number.
 */
export async function grantServiceQuotas(
  userId: string,
  grants: Record<string, number | null>,
): Promise<void> {
  const resetsAt = nextPeriodReset();
  for (const [metric, limit] of Object.entries(grants)) {
    await db
      .insert(quotas)
      .values({ userId, metric, limit, used: 0, resetsAt: isStandingMetric(metric) ? null : resetsAt })
      .onConflictDoUpdate({
        target: [quotas.userId, quotas.metric],
        set: {
          limit:
            limit === null
              ? sql`null`
              : sql`case when ${quotas.limit} is null then null else ${quotas.limit} + ${limit} end`,
          updatedAt: new Date(),
        },
      });
  }
}

/** The inverse, for a cancelled or deleted service. Floors at 0; unlimited stays. */
export async function revokeServiceQuotas(
  userId: string,
  grants: Record<string, number | null>,
): Promise<void> {
  for (const [metric, limit] of Object.entries(grants)) {
    if (limit === null) continue;
    await db
      .update(quotas)
      .set({ limit: sql`greatest(0, ${quotas.limit} - ${limit})`, updatedAt: new Date() })
      .where(and(eq(quotas.userId, userId), eq(quotas.metric, metric), sql`${quotas.limit} is not null`));
  }
}

export type ConsumeResult =
  | { ok: true; remaining: number | null }
  | { ok: false; reason: "limit_reached" | "not_included" };

/**
 * Spends `amount` of a metric, atomically.
 *
 * The increment and the limit check are **one statement**: a read-then-write
 * would let two concurrent demo runs both see 19/20 and both go through. The
 * `WHERE` does the checking, and an update that matches no row is the refusal.
 */
export async function consume(
  userId: string,
  metric: string,
  amount = 1,
): Promise<ConsumeResult> {
  const [row] = await db
    .select()
    .from(quotas)
    .where(and(eq(quotas.userId, userId), eq(quotas.metric, metric)))
    .limit(1);

  // No row at all: the plan doesn't meter this. Nothing to spend.
  if (!row) return { ok: true, remaining: null };
  if (row.limit === 0) return { ok: false, reason: "not_included" };
  if (row.limit === null) return { ok: true, remaining: null };

  const expired = row.resetsAt !== null && row.resetsAt.getTime() <= Date.now();
  const base = expired ? sql`0` : quotas.used;

  const updated = await db
    .update(quotas)
    .set({
      used: sql`${base} + ${amount}`,
      resetsAt: expired ? nextPeriodReset() : row.resetsAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(quotas.id, row.id),
        // The guard: the post-increment value must still fit under the limit.
        sql`${base} + ${amount} <= ${row.limit}`,
      ),
    )
    .returning({ used: quotas.used });

  if (updated.length === 0) return { ok: false, reason: "limit_reached" };
  return { ok: true, remaining: Math.max(0, row.limit - updated[0].used) };
}

/** Gives back an allowance — used when an action fails after `consume()` succeeded. */
export async function refund(userId: string, metric: string, amount = 1): Promise<void> {
  await db
    .update(quotas)
    .set({ used: sql`greatest(0, ${quotas.used} - ${amount})`, updatedAt: new Date() })
    .where(and(eq(quotas.userId, userId), eq(quotas.metric, metric)));
}

/**
 * Every service an account holds, newest first, with its catalogue entry when
 * it has one (a bespoke service has none). This replaced `getSubscription`,
 * which assumed exactly one row — the model this table no longer has.
 */
export async function listSubscriptions(userId: string) {
  return db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .leftJoin(plans, eq(plans.slug, subscriptions.planSlug))
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt));
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
