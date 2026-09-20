import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, notifications, subscriptions } from "@/lib/db/schema";
import { applyPlanQuotas } from "@/lib/quotas";
import { getSetting } from "@/lib/settings";

/**
 * The three things nearly every server action does after it writes: make sure
 * the account is provisioned, leave an audit line, tell someone.
 *
 * They live together because every action needs all three and importing three
 * modules to log one change is how audit lines stop getting written.
 */

/**
 * Called on the first dashboard hit rather than from an auth hook.
 *
 * Better Auth's `user.create.after` runs inside the sign-up request, and a
 * failure there (a plan row missing on a fresh database, say) would fail the
 * sign-up itself and leave the visitor with no account at all. Doing it here is
 * idempotent and can't lock anyone out — `onConflictDoNothing` on the unique
 * `user_id` means concurrent tabs can both call it safely.
 */
export async function ensureProvisioned(userId: string): Promise<void> {
  const planSlug = await getSetting("defaultPlan");
  const inserted = await db
    .insert(subscriptions)
    .values({ userId, planSlug, status: "active" })
    .onConflictDoNothing({ target: subscriptions.userId })
    .returning({ id: subscriptions.id });

  if (inserted.length > 0) await applyPlanQuotas(userId, planSlug);
}

export async function logActivity(entry: {
  actorId?: string | null;
  action: string;
  entity?: string;
  entityId?: string | number;
  meta?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(activityLog).values({
    actorId: entry.actorId ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId === undefined ? null : String(entry.entityId),
    meta: entry.meta,
  });
}

export async function notify(entry: {
  userId: string;
  type?: string;
  title: string;
  body?: string;
  href?: string;
}): Promise<void> {
  await db.insert(notifications).values({
    userId: entry.userId,
    type: entry.type ?? "system",
    title: entry.title,
    body: entry.body,
    href: entry.href,
  });
}

/** One row per recipient — see the note in AGENTS.md about broadcast scale. */
export async function notifyMany(
  userIds: string[],
  entry: { type?: string; title: string; body?: string; href?: string },
): Promise<number> {
  if (userIds.length === 0) return 0;
  await db.insert(notifications).values(
    userIds.map((userId) => ({
      userId,
      type: entry.type ?? "system",
      title: entry.title,
      body: entry.body,
      href: entry.href,
    })),
  );
  return userIds.length;
}

export async function unreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

export async function recentNotifications(userId: string, limit = 8) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}
