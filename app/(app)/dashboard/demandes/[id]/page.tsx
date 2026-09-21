import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/guard";
import {
  getOwnRequest,
  listAttachments,
  listMessages,
  listQuotes,
} from "@/lib/server/queries";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { StatusChip } from "@/components/dashboard/ui";
import { Thread } from "@/components/dashboard/Thread";
import { FileUpload } from "@/components/dashboard/FileUpload";
import { ReplyForm } from "./ReplyForm";
import { CloseRequestButton } from "./CloseRequestButton";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  TYPE_LABELS,
  isClosed,
  type RequestPriority,
  type RequestStatus,
  type RequestType,
} from "@/lib/requests";
import { SERVICES } from "@/lib/data/services";
import { formatDateTime } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { MAX_UPLOAD_BYTES, storageConfigured } from "@/lib/storage";
import Link from "next/link";

export const metadata: Metadata = { title: "Demande" };

export default async function DemandeDetailPage({
  params,
}: PageProps<"/dashboard/demandes/[id]">) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const user = await requireUser(`/dashboard/demandes/${id}`);
  const request = await getOwnRequest(user.id, numericId);
  if (!request) notFound();

  // `false` on both: this is the client's view, so staff notes and internal
  // files must not be fetched at all — not fetched and hidden, not fetched.
  const [messages, files, quotes] = await Promise.all([
    listMessages(request.id, false),
    listAttachments(request.id, false),
    listQuotes(user.id),
  ]);

  const service = SERVICES.find((s) => s.slug === request.serviceSlug);
  const relatedQuotes = quotes.filter((q) => q.quote.requestId === request.id);
  const closed = isClosed(request.status);

  return (
    <>
      <PageHeader
        title={request.title}
        description={`${request.ref} · ouverte le ${formatDateTime(request.createdAt)}`}
        backHref="/dashboard/demandes"
        backLabel="Mes demandes"
        actions={
          <>
            <StatusChip
              label={STATUS_LABELS[request.status as RequestStatus] ?? request.status}
              tone={STATUS_TONE[request.status as RequestStatus] ?? STATUS_TONE.nouvelle}
            />
            {!closed && <CloseRequestButton requestId={request.id} />}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Panel title="Votre demande">
            <p className="whitespace-pre-wrap text-sm text-fg/80">{request.details}</p>
          </Panel>

          <Panel title="Échanges" bodyClassName="p-5">
            <Thread
              messages={messages.map((m) => ({
                id: m.message.id,
                body: m.message.body,
                internal: m.message.internal,
                createdAt: m.message.createdAt,
                authorId: m.message.authorId,
                authorName: m.author?.name ?? "Équipe WICLOUD",
              }))}
              files={files.map((f) => ({
                id: f.id,
                filename: f.filename,
                sizeBytes: f.sizeBytes,
                internal: f.internal,
                createdAt: f.createdAt,
              }))}
              viewerId={user.id}
              emptyLabel="Notre équipe vous répondra ici. Vous recevrez une notification."
            />

            {closed ? (
              <p className="mt-6 rounded-2xl bg-soft px-4 py-3 text-sm text-fg/80">
                Cette demande est clôturée. Ouvrez-en une nouvelle pour un sujet connexe.
              </p>
            ) : (
              <div className="mt-6 flex flex-col gap-4 border-t border-fg/10 pt-6">
                <ReplyForm requestId={request.id} />
                <FileUpload
                  requestId={request.id}
                  maxBytes={MAX_UPLOAD_BYTES}
                  disabled={!storageConfigured()}
                  disabledReason="L'envoi de fichiers sera disponible prochainement."
                />
              </div>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Informations">
            <dl className="flex flex-col gap-3 text-sm">
              <Row label="Référence" value={request.ref} />
              <Row
                label="Type"
                value={TYPE_LABELS[request.type as RequestType] ?? request.type}
              />
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

          {relatedQuotes.length > 0 && (
            <Panel title="Devis liés" bodyClassName="p-0">
              <ul className="divide-y divide-fg/10">
                {relatedQuotes.map(({ quote }) => (
                  <li key={quote.id}>
                    <Link
                      href={`/dashboard/devis/${quote.id}`}
                      className="flex items-center justify-between gap-3 px-6 py-3.5 transition-colors hover:bg-soft"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-fg">{quote.title}</span>
                        <span className="block text-xs text-fg/80">{quote.ref}</span>
                      </span>
                      <span className="shrink-0 text-sm font-[650] tabular-nums text-fg">
                        {formatMoney(quote.amountCents, quote.currency)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
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
