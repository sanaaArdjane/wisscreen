import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { NotificationFeed } from "@/components/dashboard/NotificationFeed";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser("/dashboard/notifications");

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
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
      />
      <NotificationFeed
        rows={rows}
        emptyTitle="Aucune notification"
        emptyDescription="Vous serez prévenu ici à chaque réponse, devis ou changement de statut."
      />
    </>
  );
}
