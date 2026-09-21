import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { activityLog, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/ui";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Journal d'activité" };

/**
 * French labels for the dotted verbs written by `logActivity`. An unknown action
 * falls back to its raw key rather than being hidden — a log that silently drops
 * events it doesn't recognise is worse than one that shows a slug.
 */
const ACTION_LABELS: Record<string, string> = {
  "request.created": "Demande créée",
  "request.replied": "Réponse à une demande",
  "request.internal_note": "Note interne ajoutée",
  "request.status_changed": "Statut de demande modifié",
  "request.assigned": "Demande attribuée",
  "request.closed_by_client": "Demande clôturée par le client",
  "quote.created": "Devis créé",
  "quote.updated": "Devis modifié",
  "quote.sent": "Devis envoyé",
  "quote.accepted": "Devis accepté",
  "quote.refused": "Devis refusé",
  "quote.deleted": "Devis supprimé",
  "invoice.created_from_quote": "Facture créée depuis un devis",
  "invoice.status_changed": "Statut de facture modifié",
  "user.updated": "Fiche utilisateur modifiée",
  "user.role_changed": "Rôle modifié",
  "user.permissions_changed": "Permissions modifiées",
  "user.suspended": "Compte suspendu",
  "user.unsuspended": "Compte réactivé",
  "user.deleted": "Compte supprimé",
  "user.impersonated": "Connexion en tant qu'utilisateur",
  "user.notified": "Notification envoyée",
  "subscription.updated": "Abonnement modifié",
  "quota.set": "Quota ajusté",
  "notification.broadcast": "Notification groupée",
  "attachment.uploaded": "Fichier déposé",
  "demo.run": "Démo exécutée",
  "profile.updated": "Profil mis à jour",
  "lead.status_changed": "Message du site traité",
  "settings.updated": "Paramètres modifiés",
};

const ENTITY_LINK: Record<string, (id: string) => string> = {
  request: (id) => `/admin/demandes/${id}`,
  quote: (id) => `/admin/devis/${id}`,
  user: (id) => `/admin/utilisateurs/${id}`,
};

export default async function JournalPage({ searchParams }: PageProps<"/admin/journal">) {
  await requirePermission("activity:read");
  const { q, domaine } = await searchParams;

  const filters: SQL[] = [];

  const domain = typeof domaine === "string" ? domaine : "tous";
  if (domain !== "tous") filters.push(ilike(activityLog.action, `${domain}.%`));

  const search = typeof q === "string" ? q.trim() : "";
  if (search) {
    const like = `%${search}%`;
    filters.push(
      or(ilike(activityLog.action, like), ilike(userTable.name, like), ilike(userTable.email, like))!,
    );
  }

  const rows = await db
    .select({ log: activityLog, actor: userTable })
    .from(activityLog)
    .leftJoin(userTable, eq(userTable.id, activityLog.actorId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(activityLog.createdAt))
    .limit(300);

  return (
    <>
      <PageHeader
        title="Journal d'activité"
        description="Chaque action du back-office, avec son auteur et son horodatage."
      />

      <FilterBar
        basePath="/admin/journal"
        searchPlaceholder="Action, auteur…"
        filters={[
          {
            name: "domaine",
            label: "Domaine",
            value: domain,
            options: [
              { value: "tous", label: "Tous" },
              { value: "request", label: "Demandes" },
              { value: "quote", label: "Devis" },
              { value: "invoice", label: "Factures" },
              { value: "user", label: "Comptes" },
              { value: "subscription", label: "Abonnements" },
              { value: "quota", label: "Quotas" },
              { value: "notification", label: "Notifications" },
              { value: "demo", label: "Démos" },
              { value: "settings", label: "Paramètres" },
            ],
          },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState title="Aucune activité" description="Rien ne correspond à ces filtres." />
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-fg/10">
            {rows.map(({ log, actor }) => {
              const href =
                log.entity && log.entityId
                  ? ENTITY_LINK[log.entity]?.(log.entityId)
                  : undefined;
              const meta = log.meta as Record<string, unknown> | null;
              const summary = meta
                ? Object.entries(meta)
                    .filter(([, v]) => typeof v !== "object" || v === null)
                    .map(([k, v]) => `${k}: ${String(v)}`)
                    .slice(0, 4)
                    .join(" · ")
                : "";

              return (
                <li key={log.id} className="flex flex-col gap-1 px-6 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-fg">
                      {ACTION_LABELS[log.action] ?? log.action}
                      {href && (
                        <>
                          {" — "}
                          <Link
                            href={href}
                            className="font-[650] text-fg underline underline-offset-4"
                          >
                            ouvrir
                          </Link>
                        </>
                      )}
                    </span>
                    {summary && (
                      <span className="mt-0.5 block truncate text-xs text-fg/80">{summary}</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-fg/80">
                    {actor?.name ?? "Système"}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-fg/80">
                    {formatDateTime(log.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </>
  );
}
