import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { listRequests } from "@/lib/server/queries";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { pillPrimary } from "@/components/dashboard/pills";
import { STATUS_LABELS, STATUS_TONE, TYPE_LABELS, type RequestStatus, type RequestType } from "@/lib/requests";
import { formatDate, relativeTime } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { SERVICES } from "@/lib/data/services";

export const metadata: Metadata = { title: "Mes demandes" };

const SERVICE_NAMES = new Map(SERVICES.map((s) => [s.slug, s.name]));

export default async function DemandesPage() {
  const user = await requireUser("/dashboard/demandes");
  const rows = await listRequests(user.id);

  return (
    <>
      <PageHeader
        title="Mes demandes"
        description="Chaque demande garde son historique complet : échanges, documents et décisions."
        actions={
          <Link
            href="/dashboard/demandes/nouvelle"
            className={pillPrimary}
          >
            <Icon name="plus" className="size-4" />
            Nouvelle demande
          </Link>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Vous n'avez encore déposé aucune demande"
          description="Décrivez votre besoin — intégration, devis, démo ou support — et notre équipe prend le relais."
          action={
            <Link
              href="/dashboard/demandes/nouvelle"
              className={`${pillPrimary} mt-2`}
            >
              Déposer ma première demande
            </Link>
          }
        />
      ) : (
        <Panel bodyClassName="p-0">
          {/* A list of links rather than a <table>: every row goes to one place,
              and a table of five columns is unreadable on a phone without a
              horizontal scroll nobody discovers. */}
          <ul className="divide-y divide-fg/10">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/dashboard/demandes/${r.id}`}
                  className="flex flex-col gap-2 px-6 py-4 transition-colors hover:bg-soft sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-[650] text-fg">{r.title}</p>
                    <p className="mt-0.5 text-xs text-fg/80">
                      {r.ref} · {TYPE_LABELS[r.type as RequestType] ?? r.type}
                      {r.serviceSlug && ` · ${SERVICE_NAMES.get(r.serviceSlug) ?? r.serviceSlug}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-fg/80" title={formatDate(r.updatedAt)}>
                      {relativeTime(r.updatedAt)}
                    </span>
                    <StatusChip
                      label={STATUS_LABELS[r.status as RequestStatus] ?? r.status}
                      tone={STATUS_TONE[r.status as RequestStatus] ?? STATUS_TONE.nouvelle}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
