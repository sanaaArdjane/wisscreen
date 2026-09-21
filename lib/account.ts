import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, notifications, user as userTable } from "@/lib/db/schema";
import { can, type PermissionKey } from "@/lib/permissions";
import { publish, publishMany, type RealtimeEvent } from "@/lib/realtime";

/**
 * The two things nearly every server action does after it writes: leave an
 * audit line, tell someone.
 *
 * They live together because every action needs both, and importing two
 * modules to log one change is how audit lines stop getting written.
 *
 * (`ensureProvisioned` used to live here and gave every new account a free
 * "Découverte" subscription on first visit. A subscription is now a service a
 * customer *bought*, provisioned by the desk — handing one out on sign-up would
 * be recording a sale that never happened.)
 */

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

export type NotifyEntry = {
  type?: string;
  title: string;
  body?: string;
  href?: string;
  /** Who caused it — skipped as a recipient by `notifyStaff`, and shown in the feed. */
  actorId?: string | null;
  /** What it is about. Rides the live event so an open page on that record can
   *  refresh itself, and a page on some other record can ignore it. */
  entity?: string;
  entityId?: string | number;
};

/** Notification `type` → the live event `kind`. Anything unknown is a plain bell. */
function kindFor(type: string | undefined): RealtimeEvent["kind"] {
  switch (type) {
    case "message":
    case "request":
    case "quote":
    case "invoice":
    case "demo":
    case "subscription":
      return type;
    default:
      return "notification";
  }
}

function row(userId: string, entry: NotifyEntry) {
  return {
    userId,
    type: entry.type ?? "system",
    title: entry.title,
    body: entry.body,
    href: entry.href,
    actorId: entry.actorId ?? null,
    entity: entry.entity,
    entityId: entry.entityId === undefined ? null : String(entry.entityId),
  };
}

/**
 * Write one notification **and ring the doorbell**.
 *
 * Every notification in the product goes through here or `notifyMany` — there
 * is no raw insert anywhere else — which is what makes the live feed complete
 * without touching a single call site. The publish is after the insert and
 * never throws: the row is the truth, the event is only the nudge to go read it.
 */
export async function notify(entry: NotifyEntry & { userId: string }): Promise<void> {
  const [inserted] = await db
    .insert(notifications)
    .values(row(entry.userId, entry))
    .returning({ id: notifications.id });
  await publish(entry.userId, {
    kind: kindFor(entry.type),
    id: inserted?.id,
    entity: entry.entity,
    entityId: entry.entityId === undefined ? undefined : String(entry.entityId),
  });
}

/** One row per recipient — see the note in AGENTS.md about broadcast scale. */
export async function notifyMany(userIds: string[], entry: NotifyEntry): Promise<number> {
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return 0;
  await db.insert(notifications).values(unique.map((id) => row(id, entry)));
  await publishMany(unique, {
    kind: kindFor(entry.type),
    entity: entry.entity,
    entityId: entry.entityId === undefined ? undefined : String(entry.entityId),
  });
  return unique.length;
}

/**
 * Everyone on the desk who holds `permission`, minus the person who caused it.
 *
 * `can()` layers a per-account override over the role's defaults, so this
 * cannot be a SQL `where role in (...)` — a plain user can be *granted*
 * `requests:read` and a staff member can have it *revoked*. It narrows in SQL
 * to anyone who could plausibly hold it (staff, admin, or with overrides),
 * then asks `can()` for the final answer, which keeps the rule in one place.
 */
export async function staffWith(
  permission: PermissionKey,
  exceptUserId?: string | null,
): Promise<string[]> {
  const candidates = await db
    .select({
      id: userTable.id,
      role: userTable.role,
      permissions: userTable.permissions,
      banned: userTable.banned,
    })
    .from(userTable)
    .where(
      and(
        or(
          inArray(userTable.role, ["staff", "admin"]),
          sql`${userTable.permissions} is not null`,
        ),
        or(isNull(userTable.banned), eq(userTable.banned, false)),
        exceptUserId ? ne(userTable.id, exceptUserId) : undefined,
      ),
    );
  return candidates.filter((u) => can(u, permission)).map((u) => u.id);
}

/**
 * Tell the desk. This is the half of the notification system that was missing:
 * a new demande, a client's reply on an unassigned request, a closed request
 * and a new contact lead each reached **nobody** in-app before — an e-mail to
 * one address, and a bell that never moved.
 */
export async function notifyStaff(permission: PermissionKey, entry: NotifyEntry): Promise<number> {
  const ids = await staffWith(permission, entry.actorId);
  return notifyMany(ids, entry);
}

export async function unreadCount(userId: string): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return r?.n ?? 0;
}

export async function recentNotifications(userId: string, limit = 8) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}
