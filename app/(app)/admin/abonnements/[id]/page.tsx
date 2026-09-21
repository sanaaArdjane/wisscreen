import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans, quotes, requests, subscriptions, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { StatusChip } from "@/components/dashboard/ui";
import { QuotaMeter } from "@/components/dashboard/QuotaMeter";
import { formatLines } from "@/lib/kv";
import { listQuotas, SUBSCRIPTION_LABELS, SUBSCRIPTION_TONE } from "@/lib/quotas";
import { ServiceForm, DeleteServiceForm } from "../ServiceForm";
import { serviceFormOptions } from "../options";

export const metadata: Metadata = { title: "Service" };

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function ServicePage({ params }: PageProps<"/admin/abonnements/[id]">) {
  const staff = await requirePermission("subscriptions:read");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [row] = await db
    .select({ sub: subscriptions, plan: plans, client: userTable })
    .from(subscriptions)
    .innerJoin(userTable, eq(userTable.id, subscriptions.userId))
    .leftJoin(plans, eq(plans.slug, subscriptions.planSlug))
    .where(eq(subscriptions.id, id))
    .limit(1);
  if (!row) notFound();
  const { sub, plan, client } = row;

  const [options, quotaRows, [request], [quote]] = await Promise.all([
    serviceFormOptions(),
    listQuotas(client.id),
    sub.requestId ? db.select().from(requests).where(eq(requests.id, sub.requestId)).limit(1) : Promise.resolve([]),
    sub.quoteId ? db.select().from(quotes).where(eq(quotes.id, sub.quoteId)).limit(1) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title={sub.label || plan?.name || "Service sur mesure"}
        description={`${client.name} — ${client.email}`}
        backHref="/admin/abonnements"
        backLabel="Abonnements"
        actions={
          <StatusChip label={SUBSCRIPTION_LABELS[sub.status] ?? sub.status} tone={SUBSCRIPTION_TONE[sub.status] ?? SUBSCRIPTION_TONE.pending} />
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Service">
          {can(staff, "subscriptions:write") ? (
            <ServiceForm
              clients={options.clients}
              plansList={options.plansList}
              service={{
                subscriptionId: sub.id,
                userId: sub.userId,
                planSlug: sub.planSlug,
                label: sub.label,
                requestId: sub.requestId,
                quoteId: sub.quoteId,
                price: sub.priceCents === null ? "" : String(sub.priceCents / 100),
                currency: sub.currency,
                billingPeriod: sub.billingPeriod,
                resourceSpec: formatLines(sub.resourceSpec),
                accessNotes: sub.accessNotes,
                status: sub.status,
                periodStart: day(sub.periodStart),
                renewsAt: day(sub.renewsAt),
                note: sub.note,
              }}
            />
          ) : (
            <p className="text-sm text-fg/80">Lecture seule.</p>
          )}
        </Panel>
        <div className="flex flex-col gap-6">
          <Panel title="Client">
            <Link href={`/admin/utilisateurs/${client.id}`} className="text-sm font-[650] text-fg hover:underline">
              {client.name}
            </Link>
            <p className="text-sm text-fg/80">{client.email}</p>
            {request && (
              <p className="mt-3 text-sm">
                Demande :{" "}
                <Link href={`/admin/demandes/${request.id}`} className="font-[650] text-fg hover:underline">
                  {request.ref}
                </Link>
              </p>
            )}
            {quote && (
              <p className="mt-1 text-sm">
                Devis :{" "}
                <Link href={`/admin/devis/${quote.id}`} className="font-[650] text-fg hover:underline">
                  {quote.ref}
                </Link>
              </p>
            )}
          </Panel>
          <Panel title="Consommation du client">
            {quotaRows.length === 0 ? (
              <p className="text-sm text-fg/80">Aucun quota.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {quotaRows.map((q) => (
                  <QuotaMeter key={q.metric} quota={q} showReset />
                ))}
              </div>
            )}
            <Link href={`/admin/utilisateurs/${client.id}`} className="mt-4 block text-xs font-[650] text-fg hover:underline">
              Ajuster les quotas sur la fiche client
            </Link>
          </Panel>
          {can(staff, "subscriptions:delete") && (
            <Panel title="Zone sensible">
              <DeleteServiceForm subscriptionId={sub.id} hasPlan={Boolean(plan && Object.keys(plan.defaultQuotas ?? {}).length)} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
