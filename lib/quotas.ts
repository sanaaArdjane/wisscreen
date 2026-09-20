import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, quotas, subscriptions } from "@/lib/db/schema";

/**
 * Usage allowances.
 *
 * Three rules the rest of the app relies on:
 *  - **A metric with no row, or a null limit, is unlimited.** The Entreprise plan
 *    works by simply not listing `requests.monthly`, rather than by a magic
 *    sentinel number that someone later compares with `>=`.
 *  - **A limit of 0 means "not in your plan"** — a different message from
 *    "you've used it all", so the two are distinguishable at the call site.
 *  - **The period resets lazily.** There is no cron: `consume()` notices that
 *    `resetsAt` is in the past and zeroes the counter as part of the same
 *    statement. A container that was asleep all month behaves correctly on the
 *    first request after it wakes.
 */

export const METRIC_LABELS: Record<string, string> = {
  "requests.monthly": "Demandes ce mois",
  "demo.runs": "Exécutions de démo",
  "storage.mb": "Stockage (Mo)",
};

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
 * Gives a user the allowances of a plan. Called when a subscription is created
 * or its plan changed. Metrics the new plan doesn't mention are **deleted**, not
 * left at the old value — an upgrade to Entreprise has to actually remove the
 * cap rather than leave a stale 50 sitting there.
 */
export async function applyPlanQuotas(userId: string, planSlug: string): Promise<void> {
  const [plan] = await db.select().from(plans).where(eq(plans.slug, planSlug)).limit(1);
  if (!plan) return;

  const entries = Object.entries(plan.defaultQuotas ?? {});
  const resetsAt = nextPeriodReset();

  await db.delete(quotas).where(eq(quotas.userId, userId));
  if (entries.length === 0) return;

  await db.insert(quotas).values(
    entries.map(([metric, limit]) => ({
      userId,
      metric,
      limit,
      used: 0,
      // A storage allowance is a standing total, not a monthly budget.
      resetsAt: metric.startsWith("storage.") ? null : resetsAt,
    })),
  );
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
 * The subscription a user is on, with its plan. Everyone gets one on sign-up
 * (see `lib/account.ts`), so a missing row means something went wrong rather
 * than "free tier" — the caller renders a prompt rather than assuming limits.
 */
export async function getSubscription(userId: string) {
  const [row] = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.slug, subscriptions.planSlug))
    .where(eq(subscriptions.userId, userId))
    .limit(1);
  return row ?? null;
}
