import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, isNull, notInArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { demoAccess, demos, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { StatusChip } from "@/components/dashboard/ui";
import { FileUpload } from "@/components/dashboard/FileUpload";
import { Icon } from "@/components/ui/Icon";
import { encryptionConfigured } from "@/lib/crypto";
import { MAX_UPLOAD_BYTES, storageConfigured } from "@/lib/storage";
import { getSolutions } from "@/lib/content";
import {
  DEMO_LABELS,
  DEMO_TONE,
  RUN_LABELS,
  RUN_TONE,
  parseBlocks,
  type DemoStatus,
} from "@/lib/demos";
import { listDemoFiles, listRunsForDemo, listSecretLabels } from "@/lib/server/demos";
import { formatBytes, formatDate, formatDateTime, relativeTime } from "@/lib/format";
import { DemoEditor } from "../DemoEditor";
import { DeleteDemoForm, GrantForm, RunAnswerForm } from "../DemoControls";
import { deleteDemoAccess, deleteDemoFile, deleteDemoRun, revokeDemoAccess } from "../actions";

export const metadata: Metadata = { title: "Démo" };

function dateInput(d: Date | null | undefined): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export default async function AdminDemoPage({ params }: PageProps<"/admin/demos/[id]">) {
  const staff = await requirePermission("demos:read");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [demo] = await db.select().from(demos).where(eq(demos.id, id)).limit(1);
  if (!demo) notFound();

  const mayWrite = can(staff, "demos:write");
  const mayDelete = can(staff, "demos:delete");

  const [grants, files, secrets, runs] = await Promise.all([
    db
      .select({ access: demoAccess, client: userTable })
      .from(demoAccess)
      .innerJoin(userTable, eq(userTable.id, demoAccess.userId))
      .where(eq(demoAccess.demoId, id))
      .orderBy(desc(demoAccess.createdAt)),
    listDemoFiles(id),
    listSecretLabels(id),
    listRunsForDemo(id),
  ]);

  const liveGrantUserIds = grants.filter((g) => !g.access.revokedAt).map((g) => g.client.id);
  const candidates = mayWrite
    ? await db
        .select({ id: userTable.id, name: userTable.name, email: userTable.email, company: userTable.company })
        .from(userTable)
        .where(
          and(
            eq(userTable.role, "user"),
            or(isNull(userTable.banned), eq(userTable.banned, false)),
            liveGrantUserIds.length ? notInArray(userTable.id, liveGrantUserIds) : undefined,
          ),
        )
        .orderBy(asc(userTable.name))
    : [];

  const blocks = parseBlocks(demo.blocks);

  return (
    <>
      <PageHeader
        title={demo.title}
        description={demo.summary ?? undefined}
        backHref="/admin/demos"
        backLabel="Démos"
        actions={
          <div className="flex items-center gap-2">
            <StatusChip
              label={DEMO_LABELS[demo.status as DemoStatus] ?? demo.status}
              tone={DEMO_TONE[demo.status as DemoStatus] ?? DEMO_TONE.brouillon}
            />
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          {mayWrite ? (
            <Panel title="Contenu de la démo">
              <DemoEditor
                meta={{
                  demoId: demo.id,
                  title: demo.title,
                  slug: demo.slug,
                  summary: demo.summary,
                  category: demo.category,
                  serviceSlug: demo.serviceSlug,
                  status: demo.status,
                  visibility: demo.visibility,
                  expiresAt: dateInput(demo.expiresAt),
                }}
                initialBlocks={blocks}
                storedSecrets={secrets.map((s) => `${s.blockId}:${s.label}`)}
                files={files}
                services={(await getSolutions({ includeHidden: true })).map((s) => ({ value: s.slug, label: s.name }))}
                encryption={encryptionConfigured()}
                storage={storageConfigured()}
                maxUploadBytes={MAX_UPLOAD_BYTES}
              />
            </Panel>
          ) : (
            <Panel title="Contenu de la démo">
              <p className="text-sm text-fg/80">
                {blocks.length} bloc{blocks.length > 1 ? "s" : ""}. Vous n&apos;avez pas le droit de
                modifier les démos.
              </p>
            </Panel>
          )}

          <Panel
            title="Exécutions"
            description="Les fichiers envoyés par les clients sur les blocs « dépôt de fichier », et vos réponses."
            bodyClassName={runs.length ? "p-0" : undefined}
          >
            {runs.length === 0 ? (
              <p className="text-sm text-fg/80">Aucune exécution pour l&apos;instant.</p>
            ) : (
              <ul className="divide-y divide-fg/10">
                {runs.map((run) => (
                  <li key={run.id} id={`execution-${run.id}`} className="flex flex-col gap-4 px-6 py-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-[650] text-fg">
                          {can(staff, "users:read") ? (
                            <Link href={`/admin/utilisateurs/${run.client.id}`} className="hover:underline">
                              {run.client.name}
                            </Link>
                          ) : (
                            run.client.name
                          )}
                        </span>
                        <span className="text-xs text-fg/80">
                          Démarrée {relativeTime(run.createdAt)} · mise à jour {formatDateTime(run.updatedAt)}
                        </span>
                      </span>
                      <StatusChip
                        label={RUN_LABELS[run.outcome] ?? run.outcome}
                        tone={RUN_TONE[run.outcome] ?? RUN_TONE.en_attente}
                      />
                      {mayDelete && (
                        <form action={deleteDemoRun}>
                          <input type="hidden" name="runId" value={run.id} />
                          <button
                            type="submit"
                            className="rounded-full p-2 text-danger-fg hover:bg-danger/10"
                            aria-label="Supprimer cette exécution"
                          >
                            <Icon name="trash" className="size-4" />
                          </button>
                        </form>
                      )}
                    </div>

                    <FileList title="Envoyé par le client" files={run.submitted} empty="Aucun fichier envoyé." />
                    {(run.delivered.length > 0 || run.note) && (
                      <div className="flex flex-col gap-2 rounded-2xl bg-soft p-4">
                        {run.note && <p className="whitespace-pre-wrap text-sm text-fg">{run.note}</p>}
                        <FileList title="Livré" files={run.delivered} />
                      </div>
                    )}

                    {mayWrite && run.outcome !== "ok" && run.outcome !== "error" && (
                      <div className="flex flex-col gap-4 border-t border-fg/10 pt-4">
                        <FileUpload
                          target={{ demoRunId: run.id }}
                          maxBytes={MAX_UPLOAD_BYTES}
                          disabled={!storageConfigured()}
                          label="Joindre le résultat"
                        />
                        <RunAnswerForm runId={run.id} outcome={run.outcome} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel
            title="Accès clients"
            description={
              demo.visibility === "all_clients"
                ? "Visible par tous les clients. Les accès ci-dessous servent à fixer une échéance ou une note."
                : "Seuls ces clients voient la démo."
            }
          >
            {grants.length > 0 && (
              <ul className="mb-5 flex flex-col divide-y divide-fg/10">
                {grants.map(({ access, client }) => (
                  <li key={access.id} className="flex items-start gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-[650] text-fg">{client.name}</span>
                      <span className="block truncate text-xs text-fg/80">
                        {access.revokedAt
                          ? `Révoqué le ${formatDate(access.revokedAt)}`
                          : access.expiresAt
                            ? `Jusqu'au ${formatDate(access.expiresAt)}`
                            : "Sans échéance"}
                        {access.lastAccessAt && ` · utilisé ${relativeTime(access.lastAccessAt)}`}
                      </span>
                      {access.note && <span className="block text-xs text-fg/80">{access.note}</span>}
                    </span>
                    {mayWrite && !access.revokedAt && (
                      <form action={revokeDemoAccess}>
                        <input type="hidden" name="accessId" value={access.id} />
                        <button type="submit" className="rounded-full px-3 py-1.5 text-xs font-[650] text-fg hover:bg-fg/8">
                          Révoquer
                        </button>
                      </form>
                    )}
                    {mayDelete && (
                      <form action={deleteDemoAccess}>
                        <input type="hidden" name="accessId" value={access.id} />
                        <button
                          type="submit"
                          className="rounded-full p-1.5 text-danger-fg hover:bg-danger/10"
                          aria-label={`Supprimer l'accès de ${client.name}`}
                        >
                          <Icon name="trash" className="size-4" />
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {mayWrite && <GrantForm demoId={demo.id} clients={candidates} />}
          </Panel>

          <Panel title="Fichiers de la démo">
            {files.length === 0 ? (
              <p className="text-sm text-fg/80">Ajoutez un bloc « Fichier » pour téléverser un guide ou un document.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {files.map((f) => (
                  <li key={f.id} className="flex items-center gap-2">
                    <a
                      href={`/api/uploads?id=${f.id}`}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl bg-soft px-4 py-2.5 text-sm text-fg hover:bg-fg/8"
                    >
                      <Icon name="file-text" className="size-4 shrink-0 text-fg/80" />
                      <span className="min-w-0 flex-1 truncate">{f.filename}</span>
                      <span className="text-xs tabular-nums text-fg/80">{formatBytes(f.sizeBytes)}</span>
                    </a>
                    {mayWrite && (
                      <form action={deleteDemoFile}>
                        <input type="hidden" name="attachmentId" value={f.id} />
                        <button
                          type="submit"
                          className="rounded-full p-2 text-danger-fg hover:bg-danger/10"
                          aria-label={`Supprimer ${f.filename}`}
                        >
                          <Icon name="trash" className="size-4" />
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {secrets.length > 0 && (
            <Panel title="Identifiants chiffrés">
              <ul className="flex flex-col gap-2 text-sm">
                {secrets.map((s) => (
                  <li key={`${s.blockId}:${s.label}`} className="flex justify-between gap-3">
                    <span className="truncate text-fg">{s.label === "ssh" ? "Accès SSH" : s.label}</span>
                    <span className="shrink-0 text-xs text-fg/80">
                      {s.revealCount} affichage{s.revealCount > 1 ? "s" : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-fg/80">Chaque affichage est tracé dans le journal d&apos;activité.</p>
            </Panel>
          )}

          <Panel title="Aperçu client">
            <p className="text-sm text-fg/80">
              Adresse :{" "}
              <code className="font-mono text-fg">/dashboard/demos/{demo.slug}</code>
            </p>
            <p className="mt-2 text-xs text-fg/80">
              Pour voir exactement ce qu&apos;un client voit, utilisez « Voir la plateforme comme cet
              utilisateur » depuis sa fiche.
            </p>
          </Panel>

          {mayDelete && (
            <Panel title="Zone sensible">
              <DeleteDemoForm demoId={demo.id} slug={demo.slug} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function FileList({
  title,
  files,
  empty,
}: {
  title: string;
  files: { id: number; filename: string; sizeBytes: number }[];
  empty?: string;
}) {
  if (files.length === 0 && !empty) return null;
  return (
    <div>
      <p className="mb-1.5 text-xs font-[650] text-fg/80">{title}</p>
      {files.length === 0 ? (
        <p className="text-sm text-fg/80">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {files.map((f) => (
            <li key={f.id}>
              <a
                href={`/api/uploads?id=${f.id}`}
                className="flex items-center gap-2 rounded-2xl bg-panel px-4 py-2.5 text-sm text-fg ring-1 ring-fg/10 hover:bg-fg/8"
              >
                <Icon name="download" className="size-4 shrink-0 text-fg/80" />
                <span className="min-w-0 flex-1 truncate">{f.filename}</span>
                <span className="text-xs tabular-nums text-fg/80">{formatBytes(f.sizeBytes)}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
