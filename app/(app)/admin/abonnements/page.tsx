import type { Metadata } from "next";
import Link from "next/link";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, quotas, subscriptions, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { PageHeader, Panel, StatTile } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { METRIC_LABELS, describe } from "@/lib/quotas";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Abonnements & quotas" };

const STATUS_TONE: Record<string, string> = {
  active: "bg-teal/15 text-fg border-teal/40",
  trialing: "bg-signal/15 text-fg border-signal/45",
  past_due: "bg-fg text-on-fg border-fg",
  paused: "bg-fg/5 text-fg border-fg/15",
  cancelled: "bg-fg/10 text-fg border-fg/20",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Essai",
  past_due: "En retard",
  paused: "En pause",
  cancelled: "Résiliée",
};

export default async function AbonnementsPage() {
  await requirePermission("subscriptions:read");

  const [catalogue, rows, atLimit] = await Promise.all([
    db.select().from(plans).orderBy(asc(plans.sortOrder)),
    db
      .select({ subscription: subscriptions, plan: plans, client: userTable })
      .from(subscriptions)
      .innerJoin(plans, eq(plans.slug, subscriptions.planSlug))
      .innerJoin(userTable, eq(userTable.id, subscriptions.userId))
      .orderBy(desc(subscriptions.updatedAt))
      .limit(300),
    // Accounts that have burned at least 80% of a metered allowance. This is the
    // actual reason to open this page: knowing who is about to be blocked before
    // they write in to say they were.
    db
      .select({ quota: quotas, client: userTable })
      .from(quotas)
      .innerJoin(userTable, eq(userTable.id, quotas.userId))
      .where(sql`${quotas.limit} is not null and ${quotas.limit} > 0 and ${quotas.used}::float / ${quotas.limit} >= 0.8`)
      .orderBy(desc(sql`${quotas.used}::float / ${quotas.limit}`))
      .limit(20),
  ]);

  const byPlan = catalogue.map((plan) => ({
    plan,
    count: rows.filter((r) => r.plan.slug === plan.slug).length,
  }));

  return (
    <>
      <PageHeader
        title="Abonnements & quotas"
        description="Qui est sur quelle formule, et qui approche de ses limites."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {byPlan.map(({ plan, count }) => (
          <StatTile
            key={plan.slug}
            label={plan.name}
            value={count}
            hint={
              plan.priceCents === null
                ? "Sur devis"
                : plan.priceCents === 0
                  ? "Gratuit"
                  : `${formatMoney(plan.priceCents, plan.currency)} / mois`
            }
            icon="credit-card"
          />
        ))}
        <StatTile
          label="Quotas à surveiller"
          value={atLimit.length}
          hint="Comptes à 80 % ou plus"
          icon="bar-chart"
          tone={atLimit.length > 0 ? "accent" : "cool"}
        />
      </div>

      {atLimit.length > 0 && (
        <Panel
          className="mt-6"
          title="Proches de la limite"
          description="Ajustez le quota ou proposez une formule supérieure depuis la fiche du compte."
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-fg/10">
            {atLimit.map(({ quota, client }) => {
              const view = describe(quota);
              return (
                <li key={quota.id}>
                  <Link
                    href={`/admin/utilisateurs/${client.id}`}
                    className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-soft"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-fg">{client.name}</span>
                      <span className="block text-xs text-fg/80">{client.email}</span>
                    </span>
                    <span className="shrink-0 text-sm text-fg/80">
                      {METRIC_LABELS[quota.metric] ?? quota.metric}
                    </span>
                    <span className="shrink-0 text-sm font-[650] tabular-nums text-fg">
                      {quota.used} / {quota.limit}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums text-fg/80">
                      {Math.round(view.ratio * 100)} %
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <Panel className="mt-6" title="Tous les abonnements" bodyClassName={rows.length ? "p-0" : undefined}>
        {rows.length === 0 ? (
          <EmptyState title="Aucun abonnement" />
        ) : (
          <ul className="divide-y divide-fg/10">
            {rows.map(({ subscription, plan, client }) => (
              <li key={subscription.id}>
                <Link
                  href={`/admin/utilisateurs/${client.id}`}
                  className="flex flex-col gap-2 px-6 py-4 transition-colors hover:bg-soft sm:flex-row sm:items-center sm:gap-4"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-[650] text-fg">
                      {client.name}
                    </span>
                    <span className="block truncate text-xs text-fg/80">
                      {client.email} · depuis le {formatDate(subscription.periodStart)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-fg/80">{plan.name}</span>
                  <StatusChip
                    label={STATUS_LABELS[subscription.status] ?? subscription.status}
                    tone={STATUS_TONE[subscription.status] ?? STATUS_TONE.paused}
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
