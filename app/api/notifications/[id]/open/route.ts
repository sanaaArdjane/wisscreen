import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/guard";
import { publish } from "@/lib/realtime";

/**
 * Opening a notification marks it read, then goes where it points.
 *
 * `markRead` existed as a server action with no caller, so reading a
 * notification never cleared it — the badge only moved on "tout marquer comme
 * lu". A GET through here works as a plain link (middle-click, no JS) and the
 * row is scoped to the caller by the WHERE.
 *
 * The redirect only ever follows a stored in-app path. `href` is written by our
 * own code, but a notification is exactly the kind of row an open redirect gets
 * smuggled into, so anything not starting with a single `/` goes home instead.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return Response.redirect(new URL("/connexion", request.url), 303);

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return Response.redirect(new URL("/", request.url), 303);

  const [row] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.id, id), eq(notifications.userId, user.id), isNull(notifications.readAt)),
    )
    .returning({ href: notifications.href });

  // Already read (or not yours): still follow a stored link if it is yours.
  const target =
    row?.href ??
    (
      await db
        .select({ href: notifications.href })
        .from(notifications)
        .where(and(eq(notifications.id, id), eq(notifications.userId, user.id)))
        .limit(1)
    )[0]?.href;

  // Other tabs of the same account drop their badge too.
  if (row) await publish(user.id, { kind: "notification", id });

  const safe = target && target.startsWith("/") && !target.startsWith("//") ? target : "/dashboard";
  return Response.redirect(new URL(safe, request.url), 303);
}
