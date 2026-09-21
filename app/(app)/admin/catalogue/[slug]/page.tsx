import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, subscriptions, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { StatusChip } from "@/components/dashboard/ui";
import { formatLines } from "@/lib/kv";
import { SUBSCRIPTION_LABELS, SUBSCRIPTION_TONE } from "@/lib/quotas";
import { formatDate } from "@/lib/format";
import { CatalogueForm, DeleteCatalogueForm } from "../CatalogueForm";

export const metadata: Metadata = { title: "Offre" };

export default async function CatalogueItemPage({ params }: PageProps<"/admin/catalogue/[slug]">) {
  const staff = await requirePermission("subscriptions:read");
  const { slug } = await params;
  const [item] = await db.select().from(plans).where(eq(plans.slug, slug)).limit(1);
  if (!item) notFound();

  const subs = await db
    .select({ sub: subscriptions, client: { id: userTable.id, name: userTable.name } })
    .from(subscriptions)
    .innerJoin(userTable, eq(userTable.id, subscriptions.userId))
    .where(eq(subscriptions.planSlug, slug))
    .orderBy(desc(subscriptions.createdAt));

  return (
    <>
      <PageHeader title={item.name} description={item.description} backHref="/admin/catalogue" backLabel="Catalogue" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Offre">
          {can(staff, "subscriptions:write") ? (
            <CatalogueForm
              isEdit
              item={{
                slug: item.slug,
                name: item.name,
                description: item.description,
                category: item.category,
                price: item.priceCents === null ? "" : String(item.priceCents / 100),
                currency: item.currency,
                billingPeriod: item.billingPeriod,
                specs: formatLines(item.specs),
                features: (item.features ?? []).join("\n"),
                grants: formatLines(item.defaultQuotas),
                sortOrder: item.sortOrder,
                active: item.active,
              }}
            />
          ) : (
            <p className="text-sm text-fg/80">Lecture seule.</p>
          )}
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel title="Souscriptions" bodyClassName={subs.length ? "p-0" : undefined}>
            {subs.length === 0 ? (
              <p className="text-sm text-fg/80">Aucun client sur cette offre.</p>
            ) : (
              <ul className="divide-y divide-fg/10">
                {subs.map(({ sub, client }) => (
                  <li key={sub.id}>
                    <Link href={`/admin/abonnements/${sub.id}`} className="flex items-center gap-3 px-6 py-3 hover:bg-soft">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-fg">{client.name}</span>
                        <span className="block text-xs text-fg/80">depuis le {formatDate(sub.periodStart)}</span>
                      </span>
                      <StatusChip label={SUBSCRIPTION_LABELS[sub.status] ?? sub.status} tone={SUBSCRIPTION_TONE[sub.status] ?? SUBSCRIPTION_TONE.pending} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {can(staff, "subscriptions:delete") && (
            <Panel title="Zone sensible">
              <DeleteCatalogueForm slug={item.slug} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
