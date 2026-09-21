import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import {
  getRequestById,
  listAssignees,
  listAttachments,
  listMessages,
} from "@/lib/server/queries";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { StatusChip } from "@/components/dashboard/ui";
import { pillPrimary } from "@/components/dashboard/pills";
import { Thread } from "@/components/dashboard/Thread";
import { FileUpload } from "@/components/dashboard/FileUpload";
import { AssignControl, StaffReplyForm, StatusControl } from "./RequestControls";
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
  const [messages, files, assignees] = await Promise.all([
    listMessages(request.id, true),
    listAttachments(request.id, true),
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
              messages={messages.map((m) => ({
                id: m.message.id,
                body: m.message.body,
                internal: m.message.internal,
                createdAt: m.message.createdAt,
                authorId: m.message.authorId,
                authorName: m.author?.name ?? "Compte supprimé",
              }))}
              files={files.map((f) => ({
                id: f.id,
                filename: f.filename,
                sizeBytes: f.sizeBytes,
                internal: f.internal,
                createdAt: f.createdAt,
              }))}
              viewerId={staff.id}
            />

            {writable && (
              <div className="mt-6 flex flex-col gap-4 border-t border-fg/10 pt-6">
                <StaffReplyForm requestId={request.id} />
                <FileUpload
                  target={{ requestId: request.id }}
                  maxBytes={MAX_UPLOAD_BYTES}
                  label="Joindre un livrable"
                  disabled={!storageConfigured()}
                  disabledReason="Stockage non configuré sur cet environnement."
                />
              </div>
            )}
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
            </>
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
