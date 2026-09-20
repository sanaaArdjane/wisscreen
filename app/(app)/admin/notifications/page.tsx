import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireStaff } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { NotificationFeed } from "@/components/dashboard/NotificationFeed";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Notifications" };

/**
 * A staff member's **own** feed — what the bell in the top bar points at.
 *
 * This used to be the broadcast composer, which meant the bell led to a "send a
 * message to everyone" form instead of the notifications it was counting. The
 * composer moved to `/admin/notifications/envoyer`; your own feed is the thing
 * that lives at the obvious URL.
 *
 * No permission gate: everyone with a back-office account has notifications of
 * their own (an assigned request, a quote a client answered).
 */
export default async function AdminNotificationsPage() {
  const staff = await requireStaff();

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, staff.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  const unread = rows.filter((n) => !n.readAt).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={
          unread > 0 ? `${unread} non lue${unread > 1 ? "s" : ""}.` : "Tout est à jour."
        }
        actions={
          can(staff, "notifications:write") && (
            <Link
              href="/admin/notifications/envoyer"
              className="control-signal inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
            >
              <Icon name="send" className="size-4" />
              Envoyer une notification
            </Link>
          )
        }
      />

      <NotificationFeed
        rows={rows}
        emptyTitle="Aucune notification"
        emptyDescription="Vous serez prévenu ici quand une demande vous est attribuée ou qu'un client répond."
      />
    </>
  );
}
