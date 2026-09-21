import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requests, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can, effectivePermissions, ROLES } from "@/lib/permissions";
import {
  listQuotas,
  listSubscriptions,
  METRIC_LABELS,
  PERIOD_LABELS,
  SUBSCRIPTION_LABELS,
  SUBSCRIPTION_TONE,
} from "@/lib/quotas";
import { formatMoney } from "@/lib/money";
import { pillSmall } from "@/components/dashboard/pills";
import { PageHeader, Panel, StatTile } from "@/components/dashboard/PageHeader";
import { StatusChip } from "@/components/dashboard/ui";
import { QuotaMeter } from "@/components/dashboard/QuotaMeter";
import {
  DeleteUserForm,
  ImpersonateButton,
  MessageForm,
  PermissionMatrix,
  QuotaForm,
  RoleForm,
  SuspendForm,
  UserProfileForm,
} from "./UserControls";
import { STATUS_LABELS, STATUS_TONE, type RequestStatus } from "@/lib/requests";
import { formatDate, formatDateTime, relativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Fiche utilisateur" };

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrateur",
  staff: "Équipe",
  user: "Client",
};

export default async function UserDetailPage({ params }: PageProps<"/admin/utilisateurs/[id]">) {
  const { id } = await params;
  const staff = await requirePermission("users:read");

  const [target] = await db.select().from(userTable).where(eq(userTable.id, id)).limit(1);
  if (!target) notFound();

  const [services, quotaRows, userRequests] = await Promise.all([
    listSubscriptions(target.id),
    listQuotas(target.id),
    db
      .select()
      .from(requests)
      .where(eq(requests.userId, target.id))
      .orderBy(desc(requests.updatedAt))
      .limit(10),
  ]);

  const isSelf = target.id === staff.id;
  const mayWriteUsers = can(staff, "users:write");
  const mayWriteTeam = can(staff, "team:write");
  const mayWriteSubs = can(staff, "subscriptions:write");

  return (
    <>
      <PageHeader
        title={target.name}
        description={`${target.email} · inscrit le ${formatDate(target.createdAt)}`}
        backHref="/admin/utilisateurs"
        backLabel="Utilisateurs"
        actions={
          <>
            <StatusChip
              label={ROLE_LABELS[target.role] ?? target.role}
              tone={
                target.role === "admin"
                  ? "bg-signal/15 text-fg border-signal/45"
                  : target.role === "staff"
                    ? "bg-steel/15 text-fg border-steel/40"
                    : "bg-fg/5 text-fg border-fg/15"
              }
            />
            {target.banned && (
              <StatusChip label="Suspendu" tone="bg-fg text-on-fg border-fg" />
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Demandes" value={userRequests.length} icon="inbox" />
        <StatTile
          label="Services actifs"
          value={services.filter((s) => s.subscription.status === "active").length}
          hint={`${services.length} au total`}
          icon="server"
        />
        <StatTile
          label="Adresse vérifiée"
          value={target.emailVerified ? "Oui" : "Non"}
          icon="check"
        />
        <StatTile
          label="Dernière activité"
          value={target.lastSeenAt ? relativeTime(target.lastSeenAt) : "—"}
          icon="clock"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {mayWriteUsers && (
            <Panel title="Fiche">
              <UserProfileForm
                userId={target.id}
                name={target.name}
                phone={target.phone}
                company={target.company}
                adminNote={target.adminNote}
                magicLinkEnabled={target.magicLinkEnabled}
              />
            </Panel>
          )}

          {mayWriteTeam && (
            <Panel
              title="Accès"
              description="Le rôle donne une base ; les cases ci-dessous ajoutent ou retirent des accès précis."
            >
              <div className="mb-6 border-b border-fg/10 pb-6">
                <RoleForm
                  userId={target.id}
                  role={target.role}
                  roles={ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] ?? r }))}
                  isSelf={isSelf}
                />
              </div>
              <PermissionMatrix
                // Remount on a role change so the checkboxes reseed from the new
                // role's defaults instead of the ones rendered a moment ago.
                key={target.role}
                userId={target.id}
                role={target.role}
                effective={effectivePermissions(target)}
                isSelf={isSelf}
              />
            </Panel>
          )}

          <Panel
            title="Services"
            description="Ce que ce client a souscrit : serveurs, infrastructure, services à la consommation."
            actions={
              mayWriteSubs && (
                <Link href={`/admin/abonnements/nouveau?client=${target.id}`} className={pillSmall}>
                  Provisionner
                </Link>
              )
            }
            bodyClassName={services.length ? "p-0" : undefined}
          >
            {services.length === 0 ? (
              <p className="text-sm text-fg/80">Aucun service souscrit.</p>
            ) : (
              <ul className="divide-y divide-fg/10">
                {services.map(({ subscription: sub, plan }) => (
                  <li key={sub.id}>
                    <Link
                      href={`/admin/abonnements/${sub.id}`}
                      className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-soft"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-[650] text-fg">
                          {sub.label || plan?.name || "Service sur mesure"}
                        </span>
                        <span className="block text-xs text-fg/80">
                          {sub.priceCents === null
                            ? "Sur devis"
                            : `${formatMoney(sub.priceCents, sub.currency)} ${PERIOD_LABELS[sub.billingPeriod] ?? ""}`}
                          {sub.renewsAt && ` · renouvellement le ${formatDate(sub.renewsAt)}`}
                        </span>
                      </span>
                      <StatusChip
                        label={SUBSCRIPTION_LABELS[sub.status] ?? sub.status}
                        tone={SUBSCRIPTION_TONE[sub.status] ?? SUBSCRIPTION_TONE.pending}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Quotas"
            description={
              mayWriteSubs
                ? "Ce que ce client consomme sur les services mesurés : ajustez une limite, remettez un compteur à zéro, ou ajoutez une métrique."
                : undefined
            }
          >
            {mayWriteSubs ? (
              <div className="flex flex-col gap-6">
                {quotaRows.length === 0 && (
                  <p className="text-sm text-fg/80">
                    Aucun quota : tout est illimité. Un service provisionné ajoute les siens.
                  </p>
                )}
                {quotaRows.map((q) => (
                  <QuotaForm
                    key={q.metric}
                    userId={target.id}
                    metric={q.metric}
                    label={METRIC_LABELS[q.metric] ?? q.metric}
                    limit={q.limit}
                    used={q.used}
                    canDelete={can(staff, "subscriptions:delete")}
                  />
                ))}
                <div className="border-t border-fg/10 pt-5">
                  <QuotaForm
                    userId={target.id}
                    metricOptions={Object.entries(METRIC_LABELS)
                      .filter(([m]) => !quotaRows.some((q) => q.metric === m))
                      .map(([value, label]) => ({ value, label }))}
                  />
                </div>
              </div>
            ) : quotaRows.length === 0 ? (
              <p className="text-sm text-fg/80">Aucun quota appliqué à ce compte.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {quotaRows.map((q) => (
                  <QuotaMeter key={q.metric} quota={q} showReset />
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Demandes récentes" bodyClassName={userRequests.length ? "p-0" : undefined}>
            {userRequests.length === 0 ? (
              <p className="text-sm text-fg/80">Aucune demande.</p>
            ) : (
              <ul className="divide-y divide-fg/10">
                {userRequests.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/admin/demandes/${r.id}`}
                      className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-soft"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-fg">{r.title}</span>
                        <span className="block text-xs text-fg/80">
                          {r.ref} · {formatDateTime(r.updatedAt)}
                        </span>
                      </span>
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
        </div>

        <div className="flex flex-col gap-6">
          {can(staff, "notifications:write") && (
            <Panel title="Envoyer une notification">
              <MessageForm userId={target.id} />
            </Panel>
          )}

          {mayWriteUsers && (
            <>
              <Panel
                title="Se connecter à sa place"
                description="Ouvre son espace client avec une bannière permanente, pour reproduire un problème."
              >
                <ImpersonateButton userId={target.id} isSelf={isSelf} />
              </Panel>

              <Panel title="Suspension">
                <SuspendForm
                  userId={target.id}
                  banned={Boolean(target.banned)}
                  banReason={target.banReason}
                  isSelf={isSelf}
                />
              </Panel>
            </>
          )}

          {can(staff, "users:delete") && !isSelf && (
            <Panel title="Zone dangereuse">
              <DeleteUserForm userId={target.id} email={target.email} />
            </Panel>
          )}

          {target.adminNote && !mayWriteUsers && (
            <Panel title="Note interne">
              <p className="whitespace-pre-wrap text-sm text-fg/80">{target.adminNote}</p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
