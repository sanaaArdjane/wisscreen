import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ilike, inArray, isNull, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { requests, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { FilterBar } from "@/components/dashboard/FilterBar";
import {
  PRIORITY_LABELS,
  REQUEST_STATUSES,
  STATUS_LABELS,
  STATUS_TONE,
  type RequestPriority,
  type RequestStatus,
} from "@/lib/requests";
import { relativeTime } from "@/lib/format";

export const metadata: Metadata = { title: "Demandes" };

export default async function AdminDemandesPage({ searchParams }: PageProps<"/admin/demandes">) {
  await requirePermission("requests:read");
  const { statut, q, attribution } = await searchParams;

  const filters: SQL[] = [];

  // "ouvertes" is the default view rather than "toutes": the queue exists to
  // show what still needs doing, and a closed-heavy list buries that.
  const status = typeof statut === "string" ? statut : "ouvertes";
  if (status === "ouvertes") {
    filters.push(inArray(requests.status, ["nouvelle", "en_cours", "acceptee"]));
  } else if (REQUEST_STATUSES.includes(status as RequestStatus)) {
    filters.push(eq(requests.status, status));
  }

  if (attribution === "non-attribuees") {
    filters.push(isNull(requests.assignedToId));
  }

  const search = typeof q === "string" ? q.trim() : "";
  if (search) {
    const like = `%${search}%`;
    filters.push(
      or(
        ilike(requests.ref, like),
        ilike(requests.title, like),
        ilike(userTable.name, like),
        ilike(userTable.email, like),
      )!,
    );
  }

  const rows = await db
    .select({ request: requests, client: userTable })
    .from(requests)
    .innerJoin(userTable, eq(userTable.id, requests.userId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(requests.updatedAt))
    .limit(200);

  return (
    <>
      <PageHeader
        title="Demandes"
        description="La file complète : attribution, statut et historique de chaque dossier."
      />

      <FilterBar
        basePath="/admin/demandes"
        searchPlaceholder="Référence, objet, client…"
        filters={[
          {
            name: "statut",
            label: "Statut",
            value: status,
            options: [
              { value: "ouvertes", label: "Ouvertes" },
              { value: "toutes", label: "Toutes" },
              ...REQUEST_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
            ],
          },
          {
            name: "attribution",
            label: "Attribution",
            value: typeof attribution === "string" ? attribution : "toutes",
            options: [
              { value: "toutes", label: "Toutes" },
              { value: "non-attribuees", label: "Non attribuées" },
            ],
          },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Aucune demande ne correspond"
          description="Élargissez les filtres ou effacez la recherche."
        />
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-fg/10">
            {rows.map(({ request, client }) => (
              <li key={request.id}>
                <Link
                  href={`/admin/demandes/${request.id}`}
                  className="flex flex-col gap-2 px-6 py-4 transition-colors hover:bg-soft sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-[650] text-fg">{request.title}</p>
                    <p className="mt-0.5 truncate text-xs text-fg/80">
                      {request.ref} · {client.name} ({client.email})
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {request.priority !== "normale" && (
                      <span className="text-xs font-[650] text-fg/80">
                        {PRIORITY_LABELS[request.priority as RequestPriority]}
                      </span>
                    )}
                    {!request.assignedToId && (
                      <span className="rounded-full border border-fg/20 px-2 py-0.5 text-[11px] text-fg/80">
                        Non attribuée
                      </span>
                    )}
                    <span className="text-xs text-fg/80">{relativeTime(request.updatedAt)}</span>
                    <StatusChip
                      label={STATUS_LABELS[request.status as RequestStatus] ?? request.status}
                      tone={STATUS_TONE[request.status as RequestStatus] ?? STATUS_TONE.nouvelle}
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
