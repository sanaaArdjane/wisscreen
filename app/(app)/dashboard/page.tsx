import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, quotes } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";
import { clientCounters, listRequests } from "@/lib/server/queries";
import { listEntitledDemos } from "@/lib/server/demos";
import {
  PERIOD_LABELS,
  SUBSCRIPTION_LABELS,
  SUBSCRIPTION_TONE,
  listQuotas,
  listSubscriptions,
} from "@/lib/quotas";
import { recentNotifications } from "@/lib/account";
import { PageHeader, Panel, StatTile } from "@/components/dashboard/PageHeader";
import { StatusChip, EmptyState } from "@/components/dashboard/ui";
import { pillPrimary, pillSmall } from "@/components/dashboard/pills";
import { QuotaMeter } from "@/components/dashboard/QuotaMeter";
import { STATUS_LABELS, STATUS_TONE, type RequestStatus } from "@/lib/requests";
import { formatMoney, withVat } from "@/lib/money";
import { getCompany } from "@/lib/settings";
import { effectiveCompany } from "@/lib/company";
import { formatDate, relativeTime } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Mon espace" };

/**
 * The customer's home: what needs their answer, what they have running with
 * WICLOUD, what they can try, and what just happened.
 *
 * The order is deliberate — "à faire" first, because a devis waiting on the
 * customer is the one thing on this page that blocks work on the agency's side.
 */
export default async function DashboardHome() {
  const user = await requireUser("/dashboard");

  const [counters, recent, services, usage, demos, notifications, pendingQuotes, unpaid, company] =
    await Promise.all([
      clientCounters(user.id),
      listRequests(user.id, 5),
      listSubscriptions(user.id),
      listQuotas(user.id),
      listEntitledDemos(user.id),
      recentNotifications(user.id, 6),
      db
        .select()
        .from(quotes)
        .where(and(eq(quotes.userId, user.id), eq(quotes.status, "envoye")))
        .orderBy(desc(quotes.updatedAt))
        .limit(5),
      db
        .select()
        .from(invoices)
        .where(and(eq(invoices.userId, user.id), inArray(invoices.status, ["envoyee", "en_retard"])))
        .orderBy(invoices.dueAt),
      getCompany(),
    ]);
  // TTC per document — each devis/facture may carry its own VAT rate.
  const ttc = (d: { amountCents: number; overrides: unknown }) =>
    withVat(d.amountCents, effectiveCompany(company, d.overrides as never).vatRate);
  const unpaidTtc = unpaid.reduce((sum, inv) => sum + ttc(inv), 0);

  const activeServices = services.filter((s) => s.subscription.status === "active");
  const liveServices = services.filter((s) => s.subscription.status !== "cancelled");
  const hot = usage.filter((q) => q.ratio >= 0.6);
  const todo = pendingQuotes.length + Math.min(unpaid.length, 5);
  const now = new Date();

  return (
    <>
      <PageHeader
        title={`Bonjour ${user.name.split(" ")[0]}`}
        description={
          todo > 0
            ? `${todo} élément${todo > 1 ? "s attendent" : " attend"} votre réponse.`
            : "Vos demandes, vos services et vos démos, au même endroit."
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/dashboard/demos" className={pillSmall}>
              Mes démos
            </Link>
            <Link href="/dashboard/demandes/nouvelle" className={pillPrimary}>
              <Icon name="plus" className="size-4" />
              Nouvelle demande
            </Link>
          </div>
        }
      />

      {/* One accented tile among cool ones — whichever needs the customer. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Devis à examiner"
          value={counters.pendingQuotes}
          hint={counters.pendingQuotes > 0 ? "En attente de votre réponse" : "Rien à valider"}
          href="/dashboard/devis"
          icon="file-text"
          tone={counters.pendingQuotes > 0 ? "accent" : "cool"}
        />
        <StatTile
          label="Factures à régler"
          value={counters.unpaidInvoices}
          hint={unpaidTtc > 0 ? formatMoney(unpaidTtc) : "À jour"}
          href="/dashboard/factures"
          icon="receipt"
          tone={counters.unpaidInvoices > 0 && counters.pendingQuotes === 0 ? "accent" : "cool"}
        />
        <StatTile
          label="Demandes en cours"
          value={counters.openRequests}
          hint={`${counters.totalRequests} au total`}
          href="/dashboard/demandes"
          icon="inbox"
          tone={todo === 0 ? "accent" : "cool"}
        />
        <StatTile
          label="Services actifs"
          value={activeServices.length}
          hint={liveServices.length > activeServices.length ? `${liveServices.length - activeServices.length} en préparation` : "Serveurs et services"}
          href="/dashboard/abonnement"
          icon="server"
        />
      </div>

      {todo > 0 && (
        <Panel className="mt-6" title="À faire" bodyClassName="p-0">
          <ul className="divide-y divide-fg/10">
            {pendingQuotes.map((q) => (
              <li key={`q${q.id}`}>
                <Link href={`/dashboard/devis/${q.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-soft">
                  <Icon name="file-text" className="size-5 shrink-0 text-fg/80" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-[650] text-fg">Devis {q.ref} — {q.title}</span>
                    <span className="block text-xs text-fg/80">
                      {q.validUntil ? `À accepter avant le ${formatDate(q.validUntil)}` : "En attente de votre réponse"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-[650] tabular-nums text-fg">{formatMoney(ttc(q), q.currency)}</span>
                </Link>
              </li>
            ))}
            {unpaid.slice(0, 5).map((inv) => (
              <li key={`i${inv.id}`}>
                <Link href="/dashboard/factures" className="flex items-center gap-4 px-6 py-4 hover:bg-soft">
                  <Icon name="receipt" className="size-5 shrink-0 text-fg/80" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-[650] text-fg">Facture {inv.ref} — {inv.title}</span>
                    <span className="block text-xs text-fg/80">
                      {inv.dueAt ? `Échéance le ${formatDate(inv.dueAt)}` : "À régler"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-[650] tabular-nums text-fg">{formatMoney(ttc(inv), inv.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel
            title="Demandes récentes"
            actions={<Link href="/dashboard/demandes" className={pillSmall}>Tout voir</Link>}
            bodyClassName={recent.length ? "p-0" : undefined}
          >
            {recent.length === 0 ? (
              <EmptyState
                title="Aucune demande pour l'instant"
                description="Un projet, un serveur, une démo, une question : décrivez votre besoin, nous répondons sous 48 h ouvrées."
                action={
                  <Link href="/dashboard/demandes/nouvelle" className={`${pillPrimary} mt-2`}>
                    Déposer une demande
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-fg/10">
                {recent.map((r) => (
                  <li key={r.id}>
                    <Link href={`/dashboard/demandes/${r.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-soft">
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

          <Panel
            title="Mes services"
            actions={<Link href="/dashboard/abonnement" className={pillSmall}>Détails</Link>}
            bodyClassName={liveServices.length ? "p-0" : undefined}
          >
            {liveServices.length === 0 ? (
              <p className="text-sm text-fg/80">
                Aucun service pour l&apos;instant.{" "}
                <Link href="/dashboard/abonnement" className="font-[650] text-fg underline underline-offset-2">
                  Voir nos offres
                </Link>
              </p>
            ) : (
              <ul className="divide-y divide-fg/10">
                {liveServices.slice(0, 5).map(({ subscription: s, plan }) => (
                  <li key={s.id} className="flex items-center gap-4 px-6 py-3.5">
                    <Icon name="server" className="size-5 shrink-0 text-fg/80" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-[650] text-fg">{s.label || plan?.name}</span>
                      <span className="block text-xs text-fg/80">
                        {s.priceCents === null ? "Sur devis" : `${formatMoney(s.priceCents, s.currency)} ${PERIOD_LABELS[s.billingPeriod] ?? ""}`}
                        {s.renewsAt && ` · renouvellement le ${formatDate(s.renewsAt)}`}
                      </span>
                    </span>
                    <StatusChip label={SUBSCRIPTION_LABELS[s.status] ?? s.status} tone={SUBSCRIPTION_TONE[s.status] ?? SUBSCRIPTION_TONE.pending} />
                  </li>
                ))}
              </ul>
            )}
            {hot.length > 0 && (
              <div className="flex flex-col gap-3 border-t border-fg/10 px-6 py-5">
                {hot.slice(0, 3).map((q) => (
                  <QuotaMeter key={q.metric} quota={q} />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel
            title="Mes démos"
            actions={<Link href="/dashboard/demos" className={pillSmall}>Tout voir</Link>}
            bodyClassName={demos.length ? "p-0" : undefined}
          >
            {demos.length === 0 ? (
              <p className="text-sm text-fg/80">
                Envie d&apos;évaluer une solution ?{" "}
                <Link href="/dashboard/demandes/nouvelle?type=demo" className="font-[650] text-fg underline underline-offset-2">
                  Demandez une démo
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-fg/10">
                {demos.slice(0, 4).map(({ demo, expiresAt }) => {
                  const days = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000) : null;
                  return (
                    <li key={demo.id}>
                      <Link href={`/dashboard/demos/${demo.slug}`} className="flex items-center gap-3 px-6 py-3.5 hover:bg-soft">
                        <Icon name="zap" className="size-4 shrink-0 text-fg/80" />
                        <span className="min-w-0 flex-1 truncate text-sm text-fg">{demo.title}</span>
                        {days !== null && days <= 7 && (
                          <span className="shrink-0 text-xs font-[650] text-fg">{days <= 0 ? "expire aujourd'hui" : `${days} j`}</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel
            title="Notifications"
            actions={<Link href="/dashboard/notifications" className={pillSmall}>Tout voir</Link>}
            bodyClassName={notifications.length ? "p-0" : undefined}
          >
            {notifications.length === 0 ? (
              <p className="text-sm text-fg/80">Rien de nouveau.</p>
            ) : (
              <ul className="divide-y divide-fg/10">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <a href={`/api/notifications/${n.id}/open`} className="flex gap-3 px-6 py-3.5 hover:bg-soft">
                      <span aria-hidden className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-fg/20" : "bg-signal"}`} />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${n.readAt ? "text-fg/80" : "font-[650] text-fg"}`}>{n.title}</span>
                        <span className="mt-0.5 block text-xs text-fg/80">{relativeTime(n.createdAt)}</span>
                      </span>
                    </a>
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
