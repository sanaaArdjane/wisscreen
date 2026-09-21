import type { Metadata } from "next";
import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, subscriptions } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { pillPrimary } from "@/components/dashboard/pills";
import { Icon } from "@/components/ui/Icon";
import { CATEGORY_LABELS, METRIC_LABELS, PERIOD_LABELS } from "@/lib/quotas";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Catalogue" };

export default async function CataloguePage() {
  const staff = await requirePermission("subscriptions:read");
  const items = await db
    .select({
      plan: plans,
      active: sql<number>`(select count(*)::int from ${subscriptions} where ${subscriptions.planSlug} = ${plans.slug} and ${subscriptions.status} = 'active')`,
    })
    .from(plans)
    .orderBy(asc(plans.category), asc(plans.sortOrder), asc(plans.name));

  const groups = Object.keys(CATEGORY_LABELS)
    .map((cat) => ({ cat, items: items.filter((i) => i.plan.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <PageHeader
        title="Catalogue"
        description="Les services que vous vendez : serveurs et infrastructure, services à la consommation (SMTP, IA, SMS), accompagnement. Chaque souscription part de l'un d'eux, ou d'un service sur mesure."
        actions={
          can(staff, "subscriptions:write") && (
            <Link href="/admin/catalogue/nouveau" className={pillPrimary}>
              <Icon name="plus" className="size-4" />
              Nouvelle offre
            </Link>
          )
        }
      />
      {items.length === 0 ? (
        <EmptyState title="Catalogue vide" description="Ajoutez votre première offre." />
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <Panel key={g.cat} title={CATEGORY_LABELS[g.cat]} bodyClassName="p-0">
              <ul className="divide-y divide-fg/10">
                {g.items.map(({ plan, active }) => (
                  <li key={plan.slug}>
                    <Link
                      href={`/admin/catalogue/${plan.slug}`}
                      className="flex flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-soft"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-[650] text-fg">{plan.name}</span>
                        <span className="block truncate text-xs text-fg/80">
                          {Object.entries(plan.specs ?? {})
                            .map(([k, v]) => `${k} ${v}`)
                            .join(" · ") ||
                            Object.keys(plan.defaultQuotas ?? {})
                              .map((m) => METRIC_LABELS[m] ?? m)
                              .join(" · ") ||
                            plan.description}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-fg">
                        {plan.priceCents === null
                          ? "Sur devis"
                          : `${formatMoney(plan.priceCents, plan.currency)} ${PERIOD_LABELS[plan.billingPeriod] ?? ""}`}
                      </span>
                      <span className="shrink-0 text-xs text-fg/80">{active} actif{active > 1 ? "s" : ""}</span>
                      {!plan.active && <StatusChip label="Retirée" tone="bg-fg/5 text-fg border-fg/15" />}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
