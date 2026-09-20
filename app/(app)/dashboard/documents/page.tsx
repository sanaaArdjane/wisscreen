import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { listOwnDocuments } from "@/lib/server/queries";
import { listQuotas } from "@/lib/quotas";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/ui";
import { QuotaMeter } from "@/components/dashboard/QuotaMeter";
import { FileUpload } from "@/components/dashboard/FileUpload";
import { MAX_UPLOAD_BYTES, storageConfigured } from "@/lib/storage";
import { formatBytes, formatDateTime } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage() {
  const user = await requireUser("/dashboard/documents");
  const [rows, quotas] = await Promise.all([listOwnDocuments(user.id), listQuotas(user.id)]);
  const storageQuota = quotas.find((q) => q.metric === "storage.mb");

  const used = rows.reduce((sum, r) => sum + r.attachment.sizeBytes, 0);

  return (
    <>
      <PageHeader
        title="Documents"
        description="Tous les fichiers échangés avec nos équipes, quel que soit le dossier."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" bodyClassName={rows.length ? "p-0" : undefined}>
          {rows.length === 0 ? (
            <EmptyState
              title="Aucun document"
              description="Joignez un fichier à une demande, ou déposez-en un ici."
            />
          ) : (
            <ul className="divide-y divide-ink/10">
              {rows.map(({ attachment, request }) => (
                <li key={attachment.id} className="flex items-center gap-4 px-5 py-3">
                  <Icon name="file-text" className="size-5 shrink-0 text-steel" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">
                      {attachment.filename}
                    </p>
                    <p className="mt-0.5 text-xs text-ink/80">
                      {formatBytes(attachment.sizeBytes)} · {formatDateTime(attachment.createdAt)}
                      {request && (
                        <>
                          {" · "}
                          <Link
                            href={`/dashboard/demandes/${request.id}`}
                            className="text-signal-deep underline underline-offset-2"
                          >
                            {request.ref}
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <a
                    href={`/api/uploads?id=${attachment.id}`}
                    className="shrink-0 rounded-lg p-2 text-ink/80 transition-colors hover:bg-mist hover:text-ink"
                    aria-label={`Télécharger ${attachment.filename}`}
                  >
                    <Icon name="download" className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Déposer un fichier">
            <FileUpload
              maxBytes={MAX_UPLOAD_BYTES}
              disabled={!storageConfigured()}
              disabledReason="Le stockage de fichiers n'est pas encore configuré sur cet environnement."
            />
          </Panel>

          <Panel title="Stockage">
            {storageQuota ? (
              <QuotaMeter quota={storageQuota} />
            ) : (
              <p className="text-sm text-ink/80">Aucune limite de stockage sur votre formule.</p>
            )}
            <p className="mt-3 text-xs text-ink/80">
              {rows.length} fichier{rows.length > 1 ? "s" : ""} · {formatBytes(used)} au total
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
