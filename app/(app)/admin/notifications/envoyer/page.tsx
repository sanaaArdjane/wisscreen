import type { Metadata } from "next";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, plans, subscriptions, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/ui";
import { BroadcastForm } from "./BroadcastForm";
import { daysAgo, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Envoyer une notification" };

export default async function AdminNotificationsPage() {
  await requirePermission("notifications:write");

  const active = sql`${userTable.banned} is not true`;
  const since = daysAgo(30);

  // Counted here rather than in a client round-trip: the numbers are rendered
  // with the form, so the admin sees the blast radius before choosing, not after.
  const [[all], [clients], [team], [recent], catalogue, perPlan, history] = await Promise.all([
    db.select({ n: sql<number>`count(*)::int` }).from(userTable).where(active),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(userTable)
      .where(and(active, eq(userTable.role, "user"))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(userTable)
      .where(and(active, inArray(userTable.role, ["admin", "staff"]))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(userTable)
      .where(and(active, gte(userTable.createdAt, since))),
    db.select().from(plans).orderBy(asc(plans.sortOrder)),
    db
      .select({ slug: subscriptions.planSlug, n: sql<number>`count(*)::int` })
      .from(subscriptions)
      .innerJoin(userTable, eq(userTable.id, subscriptions.userId))
      .where(active)
      .groupBy(subscriptions.planSlug),
    db
      .select({ log: activityLog, actor: userTable })
      .from(activityLog)
      .leftJoin(userTable, eq(userTable.id, activityLog.actorId))
      .where(eq(activityLog.action, "notification.broadcast"))
      .orderBy(desc(activityLog.createdAt))
      .limit(15),
  ]);

  const counts: Record<string, number> = {
    tous: all?.n ?? 0,
    clients: clients?.n ?? 0,
    equipe: team?.n ?? 0,
    nouveaux: recent?.n ?? 0,
  };
  for (const row of perPlan) counts[`plan:${row.slug}`] = row.n;

  return (
    <>
      <PageHeader
        title="Envoyer une notification"
        description="Prévenez un segment de comptes dans l'application, et par e-mail si nécessaire."
        backHref="/admin/notifications"
        backLabel="Mes notifications"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Nouveau message">
          <BroadcastForm
            counts={counts}
            planOptions={catalogue.map((p) => ({ value: p.slug, label: p.name }))}
          />
        </Panel>

        <Panel title="Envois récents" bodyClassName={history.length ? "p-0" : undefined}>
          {history.length === 0 ? (
            <EmptyState title="Aucun envoi" />
          ) : (
            <ul className="divide-y divide-fg/10">
              {history.map(({ log, actor }) => {
                const meta = (log.meta ?? {}) as {
                  title?: string;
                  recipients?: number;
                  segment?: string;
                  email?: boolean;
                };
                return (
                  <li key={log.id} className="px-6 py-3.5">
                    <p className="text-sm text-fg">{meta.title ?? "—"}</p>
                    <p className="mt-0.5 text-xs text-fg/80">
                      {meta.recipients ?? 0} destinataire{(meta.recipients ?? 0) > 1 ? "s" : ""}
                      {meta.email ? " · e-mail" : ""} · {actor?.name ?? "Système"} ·{" "}
                      {formatDateTime(log.createdAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
