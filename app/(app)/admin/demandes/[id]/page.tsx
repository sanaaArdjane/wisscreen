import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { getRequestById, listAssignees, listThread } from "@/lib/server/queries";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { StatusChip } from "@/components/dashboard/ui";
import { pillPrimary, pillSmall } from "@/components/dashboard/pills";
import { Thread } from "@/components/dashboard/Thread";
import { ChatComposer } from "@/components/dashboard/ChatComposer";
import { markThreadReadByStaff, staffReply } from "../actions";
import { FileUpload } from "@/components/dashboard/FileUpload";
import { AssignControl, DeleteRequestForm, EditRequestForm, StatusControl } from "./RequestControls";
import {
  PRIORITY_LABELS,
  REQUEST_PRIORITIES,
  STATUS_LABELS,
  STATUS_TONE,
  TYPE_LABELS,
  nextStatuses,
  type RequestPriority,
  type RequestStatus,
  type RequestType,
} from "@/lib/requests";
import { SERVICES } from "@/lib/data/services";
import { formatDateTime } from "@/lib/format";
import { MAX_UPLOAD_BYTES, storageConfigured } from "@/lib/storage";

export const metadata: Metadata = { title: "Demande" };

export default async function AdminRequestPage({ params }: PageProps<"/admin/demandes/[id]">) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const staff = await requirePermission("requests:read");
  const row = await getRequestById(numericId);
  if (!row) notFound();

  const { request, client } = row;
  const writable = can(staff, "requests:write");

  // `true` here, unlike the client page: the desk sees internal notes and files.
  const [thread, assignees] = await Promise.all([
    listThread(request.id, true),
    writable ? listAssignees() : [],
  ]);

  const service = SERVICES.find((s) => s.slug === request.serviceSlug);
  const status = request.status as RequestStatus;

  return (
    <>
      <PageHeader
        title={request.title}
        description={`${request.ref} · ${client.name} · ouverte le ${formatDateTime(request.createdAt)}`}
        backHref="/admin/demandes"
        backLabel="File des demandes"
        actions={
          <>
            <StatusChip
              label={STATUS_LABELS[status] ?? request.status}
              tone={STATUS_TONE[status] ?? STATUS_TONE.nouvelle}
            />
            {can(staff, "quotes:write") && (
              <Link
                href={`/admin/devis/nouveau?demande=${request.id}`}
                className={pillPrimary}
              >
                Établir un devis
              </Link>
            )}
            {can(staff, "subscriptions:write") && (
              <Link href={`/admin/abonnements/nouveau?demande=${request.id}`} className={pillSmall}>
                Provisionner un service
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="Demande du client">
            <p className="whitespace-pre-wrap text-sm text-fg/80">{request.details}</p>
          </Panel>

          <Panel title="Fil de discussion">
            <Thread
              messages={thread.messages.map(({ message: m, author, files }) => ({
                id: m.id,
                body: m.body,
                internal: m.internal,
                createdAt: m.createdAt,
                readAt: m.readAt,
                authorId: m.authorId,
                // A null author is always a deleted staff account: deleting a
                // client cascades their requests away with them.
                authorName: author?.name ?? null,
                authorSide: m.authorId === request.userId ? "client" : "team",
                files,
              }))}
              looseFiles={thread.loose}
              viewerId={staff.id}
              viewerSide="team"
              onOpen={markThreadReadByStaff.bind(null, request.id)}
              emptyLabel="Aucun échange pour l'instant. Votre première réponse notifiera le client."
              composer={
                writable ? (
                  <div className="flex flex-col gap-3">
                    <ChatComposer
                      action={staffReply}
                      requestId={request.id}
                      allowInternal
                      allowFiles={storageConfigured()}
                      maxBytes={MAX_UPLOAD_BYTES}
                      placeholder={`Répondre à ${client.name}…`}
                    />
                    <details className="px-1 text-xs text-fg/80">
                      <summary className="cursor-pointer select-none">Joindre un livrable à la demande (hors message)</summary>
                      <div className="mt-3">
                        <FileUpload
                          target={{ requestId: request.id }}
                          maxBytes={MAX_UPLOAD_BYTES}
                          label="Joindre un livrable"
                          disabled={!storageConfigured()}
                          disabledReason="Stockage non configuré sur cet environnement."
                        />
                      </div>
                    </details>
                  </div>
                ) : undefined
              }
            />
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Client">
            <p className="text-sm font-[650] text-fg">{client.name}</p>
            <p className="text-sm text-fg/80">{client.email}</p>
            {client.company && <p className="mt-1 text-sm text-fg/80">{client.company}</p>}
            {client.phone && <p className="text-sm text-fg/80">{client.phone}</p>}
            {client.banned && (
              <p className="mt-3 rounded-2xl border border-fg/25 bg-panel px-3 py-2 text-xs text-fg">
                Compte suspendu{client.banReason ? ` — ${client.banReason}` : ""}
              </p>
            )}
            {can(staff, "users:read") && (
              <Link
                href={`/admin/utilisateurs/${client.id}`}
                className="mt-3 inline-block text-sm font-[650] text-fg underline underline-offset-4"
              >
                Voir la fiche complète
              </Link>
            )}
          </Panel>

          <Panel title="Détails">
            <dl className="flex flex-col gap-3 text-sm">
              <Row label="Type" value={TYPE_LABELS[request.type as RequestType] ?? request.type} />
              <Row label="Solution" value={service?.name ?? "—"} />
              <Row
                label="Priorité"
                value={PRIORITY_LABELS[request.priority as RequestPriority] ?? request.priority}
              />
              <Row label="Dernière activité" value={formatDateTime(request.updatedAt)} />
              {request.closedAt && (
                <Row label="Clôturée le" value={formatDateTime(request.closedAt)} />
              )}
            </dl>
          </Panel>

          {writable && (
            <>
              <Panel title="Statut">
                <StatusControl
                  requestId={request.id}
                  current={STATUS_LABELS[status] ?? request.status}
                  allowed={nextStatuses(status).map((s) => ({
                    value: s,
                    label: STATUS_LABELS[s],
                  }))}
                />
              </Panel>

              <Panel title="Attribution">
                <AssignControl
                  requestId={request.id}
                  assignees={assignees.map((a) => ({ value: a.id, label: a.name }))}
                  priorities={REQUEST_PRIORITIES.map((p) => ({
                    value: p,
                    label: PRIORITY_LABELS[p],
                  }))}
                  currentAssignee={request.assignedToId}
                  currentPriority={request.priority}
                />
              </Panel>

              <Panel title="Modifier">
                <EditRequestForm
                  requestId={request.id}
                  title={request.title}
                  details={request.details}
                  budget={request.budgetCents === null ? "" : String(request.budgetCents / 100)}
                />
              </Panel>
            </>
          )}

          {can(staff, "requests:delete") && (
            <Panel title="Zone sensible">
              <DeleteRequestForm requestId={request.id} requestRef={request.ref} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-fg/80">{label}</dt>
      <dd className="text-right font-[650] text-fg">{value}</dd>
    </div>
  );
}
