import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { QuotaMeter } from "@/components/dashboard/QuotaMeter";
import { pillPrimary, pillSmall } from "@/components/dashboard/pills";
import { Icon } from "@/components/ui/Icon";
import {
  CATEGORY_LABELS,
  METRIC_LABELS,
  PERIOD_LABELS,
  SUBSCRIPTION_LABELS,
  SUBSCRIPTION_TONE,
  listQuotas,
  listSubscriptions,
} from "@/lib/quotas";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Mes services" };

function price(cents: number | null, currency: string, period: string) {
  if (cents === null) return "Sur devis";
  if (cents === 0) return "Inclus";
  return `${formatMoney(cents, currency)} ${PERIOD_LABELS[period] ?? ""}`;
}

/**
 * What this customer has bought from WICLOUD — servers, infrastructure,
 * metered services — and how much of the metered ones they have used.
 *
 * It used to be "your plan", a platform tier that capped how many demandes
 * the customer could file. Ordering is still a human step: every "Commander"
 * opens a demande, the desk answers with a devis, and provisions the service.
 */
export default async function MesServicesPage() {
  const user = await requireUser("/dashboard/abonnement");
  const [services, usage, catalogue] = await Promise.all([
    listSubscriptions(user.id),
    listQuotas(user.id),
    db.select().from(plans).where(eq(plans.active, true)).orderBy(asc(plans.category), asc(plans.sortOrder)),
  ]);

  const live = services.filter((s) => s.subscription.status !== "cancelled");
  const past = services.filter((s) => s.subscription.status === "cancelled");
  const groups = Object.keys(CATEGORY_LABELS)
    .map((cat) => ({ cat, items: catalogue.filter((p) => p.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <PageHeader
        title="Mes services"
        description="Vos serveurs, votre infrastructure et vos services à la consommation chez WICLOUD."
        actions={
          <Link href="/dashboard/demandes/nouvelle?type=service" className={pillPrimary}>
            <Icon name="plus" className="size-4" />
            Demander un service
          </Link>
        }
      />

      {live.length === 0 ? (
        <EmptyState
          title="Aucun service pour l'instant"
          description="Déposez une demande pour un serveur, un hébergement ou un service à la consommation : nous vous envoyons un devis, puis le mettons en service ici."
          action={
            <Link href="/dashboard/demandes/nouvelle?type=service" className={`${pillPrimary} mt-2`}>
              Déposer une demande
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {live.map(({ subscription: s, plan }) => {
            const spec = Object.entries(s.resourceSpec ?? {});
            return (
              <li key={s.id} className="flex flex-col gap-4 rounded-3xl border border-fg/10 bg-panel p-6">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-[30%] bg-soft text-fg">
                    <Icon name={plan?.category === "addon" ? "zap" : plan?.category === "support" ? "users" : "server"} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-[650] leading-tight text-fg">{s.label || plan?.name || "Service"}</p>
                    <p className="mt-0.5 text-sm text-fg/80">{price(s.priceCents, s.currency, s.billingPeriod)}</p>
                  </div>
                  <StatusChip label={SUBSCRIPTION_LABELS[s.status] ?? s.status} tone={SUBSCRIPTION_TONE[s.status] ?? SUBSCRIPTION_TONE.pending} />
                </div>

                {spec.length > 0 && (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1 text-sm">
                    {spec.map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="text-fg/80">{k}</dt>
                        <dd className="text-fg">{v}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {s.accessNotes && (
                  <div className="rounded-2xl bg-soft px-4 py-3">
                    <p className="mb-1 text-xs font-[650] text-fg/80">Accès</p>
                    <p className="whitespace-pre-wrap break-words font-mono text-sm text-fg">{s.accessNotes}</p>
                  </div>
                )}

                <p className="mt-auto text-xs text-fg/80">
                  En service depuis le {formatDate(s.periodStart)}
                  {s.renewsAt && ` · renouvellement le ${formatDate(s.renewsAt)}`}
                </p>
                <Link
                  href={`/dashboard/demandes/nouvelle?type=support&title=${encodeURIComponent(`Support — ${s.label || plan?.name || "service"}`)}`}
                  className={`${pillSmall} self-start`}
                >
                  Demander de l&apos;aide
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {usage.length > 0 && (
        <Panel className="mt-6" title="Consommation" description="Les services mesurés à l'usage.">
          <div className="grid gap-5 sm:grid-cols-2">
            {usage.map((q) => (
              <QuotaMeter key={q.metric} quota={q} showReset />
            ))}
          </div>
        </Panel>
      )}

      {groups.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-1 text-xl font-[650] text-fg">Nos offres</h2>
          <p className="mb-5 text-sm text-fg/80">
            Commander ouvre une demande : nous revenons vers vous avec un devis.
          </p>
          <div className="flex flex-col gap-6">
            {groups.map((g) => (
              <div key={g.cat}>
                <p className="mb-3 text-xs font-[650] uppercase tracking-wide text-signal-fg">{CATEGORY_LABELS[g.cat]}</p>
                <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {g.items.map((p) => {
                    const owned = live.some((s) => s.subscription.planSlug === p.slug);
                    return (
                      <li
                        key={p.slug}
                        className={`flex flex-col gap-3 rounded-3xl border bg-panel p-6 ${owned ? "border-signal/55" : "border-fg/10"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-lg font-[650] leading-tight text-fg">{p.name}</p>
                          {owned && <StatusChip label="Souscrit" tone="bg-signal/15 text-fg border-signal/45" />}
                        </div>
                        <p className="text-sm text-fg/80">{p.description}</p>
                        <p className="text-xl font-[650] text-fg">{price(p.priceCents, p.currency, p.billingPeriod)}</p>
                        {Object.keys(p.specs ?? {}).length > 0 && (
                          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                            {Object.entries(p.specs).map(([k, v]) => (
                              <div key={k} className="contents">
                                <dt className="text-fg/80">{k}</dt>
                                <dd className="text-fg">{v}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        {(p.features ?? []).length > 0 && (
                          <ul className="flex flex-col gap-1.5 text-sm text-fg">
                            {p.features.map((f) => (
                              <li key={f} className="flex gap-2">
                                <Icon name="check" className="mt-0.5 size-4 shrink-0 text-signal-fg" />
                                {f}
                              </li>
                            ))}
                          </ul>
                        )}
                        {Object.keys(p.defaultQuotas ?? {}).length > 0 && (
                          <p className="text-xs text-fg/80">
                            Inclut :{" "}
                            {Object.entries(p.defaultQuotas)
                              .map(([m, n]) => `${n === null ? "illimité" : n.toLocaleString("fr-FR")} ${METRIC_LABELS[m]?.toLowerCase() ?? m}`)
                              .join(", ")}
                          </p>
                        )}
                        <Link
                          href={`/dashboard/demandes/nouvelle?type=devis&title=${encodeURIComponent(p.name)}`}
                          className={`${pillSmall} mt-auto self-start`}
                        >
                          {owned ? "En commander un autre" : "Commander"}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {past.length > 0 && (
        <Panel className="mt-10" title="Services résiliés" bodyClassName="p-0">
          <ul className="divide-y divide-fg/10">
            {past.map(({ subscription: s, plan }) => (
              <li key={s.id} className="flex items-center gap-4 px-6 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate text-fg">{s.label || plan?.name || "Service"}</span>
                <span className="text-xs text-fg/80">depuis le {formatDate(s.periodStart)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
