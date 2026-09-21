import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { clientCounters, listRequests } from "@/lib/server/queries";
import { getSubscription, listQuotas } from "@/lib/quotas";
import { recentNotifications } from "@/lib/account";
import { PageHeader, Panel, StatTile } from "@/components/dashboard/PageHeader";
import { StatusChip, EmptyState } from "@/components/dashboard/ui";
import { pillPrimary, pillSmall } from "@/components/dashboard/pills";
import { QuotaMeter } from "@/components/dashboard/QuotaMeter";
import { STATUS_LABELS, STATUS_TONE, type RequestStatus } from "@/lib/requests";
import { formatMoney } from "@/lib/money";
import { formatDate, relativeTime } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Mon espace" };

export default async function DashboardHome() {
  const user = await requireUser("/dashboard");

  const [counters, recent, subscription, quotas, notifications] = await Promise.all([
    clientCounters(user.id),
    listRequests(user.id, 5),
    getSubscription(user.id),
    listQuotas(user.id),
    recentNotifications(user.id, 5),
  ]);

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.name.split(" ")[0]}`}
        description="Vos demandes, vos quotas et ce qui attend une action de votre part."
        actions={
          <Link
            href="/dashboard/demandes/nouvelle"
            className={pillPrimary}
          >
            <Icon name="plus" className="size-4" />
            Nouvelle demande
          </Link>
        }
      />

      {/* One accented tile among cool ones — the same focal-point rule the
          marketing HighlightsReel follows. The accent goes on whatever actually
          needs the visitor's attention, so it moves to the unpaid total when
          there is one. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Demandes en cours"
          value={counters.openRequests}
          hint={`${counters.totalRequests} au total`}
          href="/dashboard/demandes"
          icon="inbox"
          tone={counters.unpaidInvoices === 0 && counters.pendingQuotes === 0 ? "accent" : "cool"}
        />
        <StatTile
          label="Devis à examiner"
          value={counters.pendingQuotes}
          hint={counters.pendingQuotes > 0 ? "En attente de votre réponse" : "Rien à valider"}
          href="/dashboard/devis"
          icon="file-text"
          tone={counters.pendingQuotes > 0 ? "accent" : "cool"}
        />
        <StatTile
          label="Factures impayées"
          value={counters.unpaidInvoices}
          hint={counters.unpaidCents > 0 ? formatMoney(counters.unpaidCents) : "À jour"}
          href="/dashboard/factures"
          icon="receipt"
          tone={counters.unpaidInvoices > 0 && counters.pendingQuotes === 0 ? "accent" : "cool"}
        />
        <StatTile
          label="Documents"
          value={counters.documents}
          hint="Fichiers partagés avec nos équipes"
          href="/dashboard/documents"
          icon="database"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title="Demandes récentes"
          actions={
            <Link
              href="/dashboard/demandes"
              className={pillSmall}
            >
              Tout voir
            </Link>
          }
          bodyClassName="p-0"
        >
          {recent.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="Aucune demande pour l'instant"
                description="Décrivez votre besoin et notre équipe vous répond sous 48 h ouvrées."
                action={
                  <Link
                    href="/dashboard/demandes/nouvelle"
                    className={`${pillPrimary} mt-2`}
                  >
                    Déposer une demande
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-fg/10">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/demandes/${r.id}`}
                    className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-soft"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-[650] text-fg">{r.title}</p>
                      <p className="mt-0.5 text-xs text-fg/80">
                        {r.ref} · mis à jour {relativeTime(r.updatedAt)}
                      </p>
                    </div>
                    <StatusChip
                      label={STATUS_LABELS[r.status as RequestStatus] ?? r.status}
                      tone={STATUS_TONE[r.status as RequestStatus] ?? STATUS_TONE.nouvelle}
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel
            title="Votre formule"
            actions={
              <Link
                href="/dashboard/abonnement"
                className={pillSmall}
              >
                Détails
              </Link>
            }
          >
            {subscription ? (
              <>
                <p className="text-lg font-[650] text-fg">{subscription.plan.name}</p>
                <p className="mt-0.5 text-sm text-fg/80">
                  Depuis le {formatDate(subscription.subscription.periodStart)}
                </p>
                <div className="mt-4 flex flex-col gap-3">
                  {quotas.slice(0, 3).map((q) => (
                    <QuotaMeter key={q.metric} quota={q} />
                  ))}
                  {quotas.length === 0 && (
                    <p className="text-sm text-fg/80">Aucune limite sur cette formule.</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-fg/80">Aucune formule active.</p>
            )}
          </Panel>

          <Panel
            title="Notifications"
            actions={
              <Link
                href="/dashboard/notifications"
                className={pillSmall}
              >
                Tout voir
              </Link>
            }
            bodyClassName={notifications.length ? "p-0" : undefined}
          >
            {notifications.length === 0 ? (
              <p className="text-sm text-fg/80">Rien de nouveau.</p>
            ) : (
              <ul className="divide-y divide-fg/10">
                {notifications.map((n) => (
                  <li key={n.id} className="px-6 py-3.5">
                    <p className="text-sm text-fg">{n.title}</p>
                    <p className="mt-0.5 text-xs text-fg/80">{relativeTime(n.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
