import type { Metadata } from "next";
import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, user as userTable } from "@/lib/db/schema";
import { requireStaff } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { adminCounters, openRequestsQueue } from "@/lib/server/queries";
import { PageHeader, Panel, StatTile } from "@/components/dashboard/PageHeader";
import { StatusChip, EmptyState } from "@/components/dashboard/ui";
import { STATUS_LABELS, STATUS_TONE, type RequestStatus } from "@/lib/requests";
import { formatMoney } from "@/lib/money";
import { relativeTime } from "@/lib/format";
import { eq } from "drizzle-orm";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminHome() {
  const staff = await requireStaff();

  // Only what this account may see. A staff member without `users:read` gets a
  // page with fewer tiles, not a page full of numbers they can't click through.
  const [counters, queue, recentUsers, activity] = await Promise.all([
    can(staff, "requests:read") || can(staff, "users:read") ? adminCounters() : null,
    can(staff, "requests:read") ? openRequestsQueue(8) : [],
    can(staff, "users:read")
      ? db
          .select({
            id: userTable.id,
            name: userTable.name,
            email: userTable.email,
            createdAt: userTable.createdAt,
            role: userTable.role,
          })
          .from(userTable)
          .orderBy(desc(userTable.createdAt))
          .limit(6)
      : [],
    can(staff, "activity:read")
      ? db
          .select({ log: activityLog, actor: userTable })
          .from(activityLog)
          .leftJoin(userTable, eq(userTable.id, activityLog.actorId))
          .orderBy(desc(activityLog.createdAt))
          .limit(8)
      : [],
  ]);

  return (
    <>
      <PageHeader
        title="Administration"
        description="Ce qui attend une action, et l'état général de la plateforme."
      />

      {counters && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Demandes à traiter"
            value={counters.openRequests}
            hint={`${counters.newRequests} nouvelle${counters.newRequests > 1 ? "s" : ""} · ${counters.unassigned} non attribuée${counters.unassigned > 1 ? "s" : ""}`}
            href="/admin/demandes"
            icon="inbox"
            tone={counters.newRequests > 0 ? "accent" : "cool"}
          />
          <StatTile
            label="Devis en attente"
            value={counters.pendingQuotes}
            hint="Réponse client attendue"
            href="/admin/devis"
            icon="file-text"
          />
          <StatTile
            label="Encours impayé"
            value={formatMoney(counters.unpaid)}
            hint={`${counters.unpaidCount} facture${counters.unpaidCount > 1 ? "s" : ""}`}
            href="/admin/factures"
            icon="receipt"
            tone={counters.newRequests === 0 && counters.unpaidCount > 0 ? "accent" : "cool"}
          />
          <StatTile
            label="Comptes"
            value={counters.users}
            hint={`${counters.staff} membre${counters.staff > 1 ? "s" : ""} d'équipe · ${counters.suspended} suspendu${counters.suspended > 1 ? "s" : ""}`}
            href="/admin/utilisateurs"
            icon="users"
          />
        </div>
      )}

      {counters && counters.newLeads > 0 && can(staff, "leads:read") && (
        <Link
          href="/admin/messages"
          className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-signal/45 bg-signal/10 px-5 py-4 transition-colors hover:border-signal"
        >
          <span className="text-sm text-ink">
            <strong className="font-semibold">
              {counters.newLeads} message{counters.newLeads > 1 ? "s" : ""}
            </strong>{" "}
            non traité{counters.newLeads > 1 ? "s" : ""} depuis le formulaire du site.
          </span>
          <span className="shrink-0 text-sm font-medium text-ink underline underline-offset-4">Ouvrir</span>
        </Link>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {can(staff, "requests:read") && (
          <Panel
            className="lg:col-span-2"
            title="File des demandes"
            description="Les demandes nouvelles et en cours, les plus récentes d'abord."
            actions={
              <Link
                href="/admin/demandes"
                className="text-sm text-signal-deep underline underline-offset-4"
              >
                Tout voir
              </Link>
            }
            bodyClassName={queue.length ? "p-0" : undefined}
          >
            {queue.length === 0 ? (
              <EmptyState title="Rien en attente" description="Toutes les demandes sont traitées." />
            ) : (
              <ul className="divide-y divide-ink/10">
                {queue.map(({ request, client }) => (
                  <li key={request.id}>
                    <Link
                      href={`/admin/demandes/${request.id}`}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-mist"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-ink">{request.title}</p>
                        <p className="mt-0.5 truncate text-xs text-ink/80">
                          {request.ref} · {client.name} · {relativeTime(request.createdAt)}
                          {!request.assignedToId && " · non attribuée"}
                        </p>
                      </div>
                      <StatusChip
                        label={STATUS_LABELS[request.status as RequestStatus] ?? request.status}
                        tone={STATUS_TONE[request.status as RequestStatus] ?? STATUS_TONE.nouvelle}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        <div className="flex flex-col gap-6">
          {can(staff, "users:read") && (
            <Panel
              title="Derniers inscrits"
              actions={
                <Link
                  href="/admin/utilisateurs"
                  className="text-sm text-signal-deep underline underline-offset-4"
                >
                  Tout voir
                </Link>
              }
              bodyClassName={recentUsers.length ? "p-0" : undefined}
            >
              {recentUsers.length === 0 ? (
                <p className="text-sm text-ink/80">Aucun compte.</p>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {recentUsers.map((u) => (
                    <li key={u.id}>
                      <Link
                        href={`/admin/utilisateurs/${u.id}`}
                        className="block px-5 py-3 transition-colors hover:bg-mist"
                      >
                        <span className="block truncate text-sm text-ink">{u.name}</span>
                        <span className="block truncate text-xs text-ink/80">
                          {u.email} · {relativeTime(u.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}

          {can(staff, "activity:read") && (
            <Panel
              title="Activité"
              actions={
                <Link
                  href="/admin/journal"
                  className="text-sm text-signal-deep underline underline-offset-4"
                >
                  Journal
                </Link>
              }
              bodyClassName={activity.length ? "p-0" : undefined}
            >
              {activity.length === 0 ? (
                <p className="text-sm text-ink/80">Rien pour l&apos;instant.</p>
              ) : (
                <ul className="divide-y divide-ink/10">
                  {activity.map(({ log, actor }) => (
                    <li key={log.id} className="px-5 py-2.5">
                      <p className="text-sm text-ink">{log.action}</p>
                      <p className="text-xs text-ink/80">
                        {actor?.name ?? "Système"} · {relativeTime(log.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
