import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, quotas, subscriptions, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel, StatTile } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { pillPrimary, pillSmall } from "@/components/dashboard/pills";
import { Icon } from "@/components/ui/Icon";
import {
  METRIC_LABELS,
  PERIOD_LABELS,
  SUBSCRIPTION_LABELS,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTION_TONE,
  describe,
} from "@/lib/quotas";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Abonnements & quotas" };

/**
 * Every provisioned service across all customers, what renews soon, and who is
 * about to hit a metered limit.
 */
export default async function AbonnementsPage({ searchParams }: PageProps<"/admin/abonnements">) {
  const staff = await requirePermission("subscriptions:read");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = typeof sp.statut === "string" ? sp.statut : "";

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 3600 * 1000);

  const [rows, atLimit, [counts]] = await Promise.all([
    db
      .select({ subscription: subscriptions, plan: plans, client: userTable })
      .from(subscriptions)
      .leftJoin(plans, eq(plans.slug, subscriptions.planSlug))
      .innerJoin(userTable, eq(userTable.id, subscriptions.userId))
      .where(
        and(
          (SUBSCRIPTION_STATUSES as readonly string[]).includes(status) ? eq(subscriptions.status, status) : undefined,
          q
            ? or(
                ilike(subscriptions.label, `%${q}%`),
                ilike(userTable.name, `%${q}%`),
                ilike(userTable.email, `%${q}%`),
                ilike(plans.name, `%${q}%`),
              )
            : undefined,
        ),
      )
      .orderBy(desc(subscriptions.updatedAt))
      .limit(300),
    // Accounts that have burned at least 80% of a metered allowance — knowing
    // who is about to be blocked before they write in to say they were.
    db
      .select({ quota: quotas, client: userTable })
      .from(quotas)
      .innerJoin(userTable, eq(userTable.id, quotas.userId))
      .where(sql`${quotas.limit} is not null and ${quotas.limit} > 0 and ${quotas.used}::float / ${quotas.limit} >= 0.8`)
      .orderBy(desc(sql`${quotas.used}::float / ${quotas.limit}`))
      .limit(20),
    db
      .select({
        active: sql<number>`count(*) filter (where ${subscriptions.status} = 'active')::int`,
        pending: sql<number>`count(*) filter (where ${subscriptions.status} in ('pending','provisioning'))::int`,
        renewing: sql<number>`count(*) filter (where ${subscriptions.status} = 'active' and ${subscriptions.renewsAt} between now() and now() + interval '30 days')::int`,
        mrr: sql<number>`coalesce(sum(case when ${subscriptions.status} = 'active' then case ${subscriptions.billingPeriod} when 'monthly' then ${subscriptions.priceCents} when 'yearly' then ${subscriptions.priceCents} / 12 else 0 end end), 0)::int`,
      })
      .from(subscriptions),
  ]);

  return (
    <>
      <PageHeader
        title="Abonnements & quotas"
        description="Les services provisionnés pour vos clients — serveurs, infrastructure, services à la consommation — et leur consommation."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/catalogue" className={pillSmall}>
              Catalogue
            </Link>
            {can(staff, "subscriptions:write") && (
              <Link href="/admin/abonnements/nouveau" className={pillPrimary}>
                <Icon name="plus" className="size-4" />
                Provisionner un service
              </Link>
            )}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Services actifs" value={counts?.active ?? 0} icon="server" />
        <StatTile
          label="À mettre en service"
          value={counts?.pending ?? 0}
          icon="clock"
          tone={(counts?.pending ?? 0) > 0 ? "accent" : "cool"}
        />
        <StatTile label="Renouvellements sous 30 j" value={counts?.renewing ?? 0} icon="refresh" />
        <StatTile label="Revenu mensuel récurrent" value={formatMoney(counts?.mrr ?? 0)} hint="Services actifs, hors sur devis" icon="bar-chart" />
      </div>

      {atLimit.length > 0 && (
        <Panel className="mt-6" title="Proches de la limite" bodyClassName="p-0">
          <ul className="divide-y divide-fg/10">
            {atLimit.map(({ quota, client }) => {
              const view = describe(quota);
              return (
                <li key={quota.id}>
                  <Link href={`/admin/utilisateurs/${client.id}`} className="flex items-center gap-4 px-6 py-3.5 hover:bg-soft">
                    <span className="min-w-0 flex-1 truncate text-sm text-fg">
                      {client.name} <span className="text-fg/80">— {METRIC_LABELS[quota.metric] ?? quota.metric}</span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-fg">
                      {view.used} / {view.limit} ({Math.round(view.ratio * 100)} %)
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <div className="mt-6">
        <FilterBar
          basePath="/admin/abonnements"
          searchPlaceholder="Client, service, offre…"
          filters={[
            {
              name: "statut",
              label: "Statut",
              value: status,
              options: [
                { value: "", label: "Tous" },
                ...SUBSCRIPTION_STATUSES.map((s) => ({ value: s, label: SUBSCRIPTION_LABELS[s] })),
              ],
            },
          ]}
        />
      </div>

      <Panel className="mt-4" bodyClassName={rows.length ? "p-0" : undefined}>
        {rows.length === 0 ? (
          <EmptyState
            title={q || status ? "Aucun service ne correspond" : "Aucun service provisionné"}
            description="Quand un client souscrit un serveur, une infrastructure ou un service à la consommation, provisionnez-le ici — idéalement depuis sa demande ou son devis accepté."
          />
        ) : (
          <ul className="divide-y divide-fg/10">
            {rows.map(({ subscription: s, plan, client }) => {
              const renewSoon = s.status === "active" && s.renewsAt && s.renewsAt < in30;
              return (
                <li key={s.id}>
                  <Link href={`/admin/abonnements/${s.id}`} className="flex flex-wrap items-center gap-4 px-6 py-4 hover:bg-soft">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-[650] text-fg">
                        {s.label || plan?.name || "Service sur mesure"}
                      </span>
                      <span className="block truncate text-xs text-fg/80">
                        {client.name}
                        {plan && s.label && s.label !== plan.name ? ` · ${plan.name}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-fg">
                      {s.priceCents === null ? "Sur devis" : `${formatMoney(s.priceCents, s.currency)} ${PERIOD_LABELS[s.billingPeriod] ?? ""}`}
                    </span>
                    {s.renewsAt && (
                      <span className={`shrink-0 text-xs ${renewSoon ? "font-[650] text-fg" : "text-fg/80"}`}>
                        renouv. {formatDate(s.renewsAt)}
                      </span>
                    )}
                    <StatusChip label={SUBSCRIPTION_LABELS[s.status] ?? s.status} tone={SUBSCRIPTION_TONE[s.status] ?? SUBSCRIPTION_TONE.pending} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
