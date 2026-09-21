import { recentNotifications, unreadCount } from "@/lib/account";
import { getCurrentUser } from "@/lib/guard";

/**
 * What the live feed fetches after an event. The SSE channel only carries a
 * pointer ("something happened for you"), so this is where the browser learns
 * what — through a request that has authenticated as that person.
 *
 * 401 rather than a redirect, for the same reason as `/api/realtime`.
 */
export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || user.banned) return Response.json({ error: "unauthorized" }, { status: 401 });

  const [unread, latest] = await Promise.all([
    unreadCount(user.id),
    recentNotifications(user.id, 5),
  ]);
  return Response.json(
    {
      unread,
      latest: latest.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        read: n.readAt !== null,
        createdAt: n.createdAt.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
