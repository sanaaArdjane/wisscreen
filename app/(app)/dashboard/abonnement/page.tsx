import type { Metadata } from "next";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { plans } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";
import { getSubscription, listQuotas, METRIC_LABELS } from "@/lib/quotas";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { QuotaMeter } from "@/components/dashboard/QuotaMeter";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Abonnement & quotas" };

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  trialing: "Période d'essai",
  past_due: "Paiement en retard",
  paused: "En pause",
  cancelled: "Résiliée",
};

export default async function AbonnementPage() {
  const user = await requireUser("/dashboard/abonnement");

  const [subscription, quotas, catalogue] = await Promise.all([
    getSubscription(user.id),
    listQuotas(user.id),
    db.select().from(plans).orderBy(asc(plans.sortOrder)),
  ]);

  const currentSlug = subscription?.plan.slug;

  return (
    <>
      <PageHeader
        title="Abonnement & quotas"
        description="Ce que comprend votre formule, et ce qu'il vous reste ce mois-ci."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Consommation">
          {quotas.length === 0 ? (
            <p className="text-sm text-ink/80">
              Aucune limite n&apos;est appliquée à votre compte.
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {quotas.map((q) => (
                <QuotaMeter key={q.metric} quota={q} showReset />
              ))}
            </div>
          )}
          <p className="mt-6 border-t border-ink/10 pt-4 text-xs text-ink/80">
            Les compteurs mensuels se réinitialisent le 1<sup>er</sup> de chaque mois. Le
            stockage est un total cumulé.
          </p>
        </Panel>

        <Panel title="Votre formule">
          {subscription ? (
            <>
              <p className="text-2xl font-semibold tracking-tight text-ink">
                {subscription.plan.name}
              </p>
              <p className="mt-1 text-sm text-ink/80">{subscription.plan.description}</p>
              <dl className="mt-4 flex flex-col gap-2 border-t border-ink/10 pt-4 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/80">Statut</dt>
                  <dd className="font-medium text-ink">
                    {STATUS_LABELS[subscription.subscription.status] ??
                      subscription.subscription.status}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink/80">Depuis le</dt>
                  <dd className="font-medium text-ink">
                    {formatDate(subscription.subscription.periodStart)}
                  </dd>
                </div>
                {subscription.subscription.periodEnd && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/80">
                      {subscription.subscription.cancelAtPeriodEnd ? "Se termine le" : "Échéance"}
                    </dt>
                    <dd className="font-medium text-ink">
                      {formatDate(subscription.subscription.periodEnd)}
                    </dd>
                  </div>
                )}
              </dl>
            </>
          ) : (
            <p className="text-sm text-ink/80">Aucune formule active sur ce compte.</p>
          )}
        </Panel>
      </div>

      <h2 className="mb-4 mt-10 text-lg font-semibold tracking-tight text-ink">
        Changer de formule
      </h2>
      <p className="mb-5 max-w-2xl text-sm text-ink/80">
        Les changements de formule passent par notre équipe : déposez une demande et nous
        ajustons votre accès, en général sous 24 h ouvrées.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        {catalogue.map((plan) => {
          const current = plan.slug === currentSlug;
          return (
            <article
              key={plan.slug}
              className={cn(
                "flex flex-col rounded-2xl border bg-paper p-6",
                // Exactly one accented card: the one you're on. The accent marks
                // state here, not a recommendation — it isn't an upsell badge.
                current ? "border-signal/55" : "border-ink/10",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold text-ink">{plan.name}</h3>
                {current && (
                  <span className="rounded-full border border-signal/45 bg-signal/10 px-2.5 py-0.5 text-xs font-medium text-ink">
                    Formule actuelle
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm text-ink/80">{plan.description}</p>

              <p className="mt-4 text-2xl font-semibold tracking-tight text-ink">
                {plan.priceCents === null ? (
                  <span className="text-lg">Sur devis</span>
                ) : plan.priceCents === 0 ? (
                  "Gratuit"
                ) : (
                  <>
                    {formatMoney(plan.priceCents, plan.currency)}
                    <span className="text-sm font-normal text-ink/80"> / mois</span>
                  </>
                )}
              </p>

              <ul className="mt-4 flex flex-1 flex-col gap-2 text-sm text-ink/80">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <Icon name="check" className="mt-0.5 size-4 shrink-0 text-signal-deep" />
                    {f}
                  </li>
                ))}
              </ul>

              {Object.keys(plan.defaultQuotas ?? {}).length > 0 && (
                <dl className="mt-4 border-t border-ink/10 pt-3 text-xs text-ink/80">
                  {Object.entries(plan.defaultQuotas).map(([metric, limit]) => (
                    <div key={metric} className="flex justify-between gap-3 py-0.5">
                      <dt>{METRIC_LABELS[metric] ?? metric}</dt>
                      <dd className="tabular-nums">{limit.toLocaleString("fr-FR")}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {!current && (
                <Link
                  href={`/dashboard/demandes/nouvelle?type=devis&title=${encodeURIComponent(plan.name)}`}
                  className="control-signal mt-5 inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
                >
                  Demander {plan.name}
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </>
  );
}
