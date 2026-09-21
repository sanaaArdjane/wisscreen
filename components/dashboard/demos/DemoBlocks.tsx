import { Markdown } from "@/lib/markdown";
import { Icon } from "@/components/ui/Icon";
import { StatusChip } from "@/components/dashboard/ui";
import { pillPrimary } from "@/components/dashboard/pills";
import {
  RUN_LABELS,
  RUN_TONE,
  SSH_SECRET_LABEL,
  effectiveExpiry,
  isExpired,
  resultSource,
  type DemoBlock,
  type DemoResult,
} from "@/lib/demos";
import { formatBytes, formatDate, relativeTime } from "@/lib/format";
import { CopyLine, RevealSecret } from "./RevealSecret";
import { FileUpload } from "@/components/dashboard/FileUpload";
import { startDemoRun, submitDemoRun } from "@/app/(app)/dashboard/demos/actions";

/**
 * A demo, block by block, as the customer sees it.
 *
 * A server component: nothing here holds a secret. Secret rows render a
 * `RevealSecret`, which fetches the value only when clicked. `now` is passed in
 * so no block calls `Date.now()` while rendering.
 */

type FileRow = { id: number; filename: string; sizeBytes: number };
type RunRow = {
  id: number;
  outcome: string;
  note: string | null;
  result: unknown;
  createdAt: Date;
  updatedAt: Date;
  submitted: FileRow[];
  delivered: FileRow[];
};

export function DemoBlocks({
  demoId,
  blocks,
  files,
  runs,
  demoExpiresAt,
  now,
  storage,
  maxUploadBytes,
}: {
  demoId: number;
  blocks: DemoBlock[];
  files: FileRow[];
  runs: RunRow[];
  demoExpiresAt: Date | null;
  now: Date;
  storage: boolean;
  maxUploadBytes: number;
}) {
  return (
    <div className="flex flex-col gap-5">
      {blocks.map((b) => (
        <section key={b.id} className="rounded-3xl border border-fg/10 bg-panel p-5 sm:p-6">
          {(b.title || b.note) && (
            <header className="mb-4">
              {b.title && <h2 className="text-lg font-[650] text-fg">{b.title}</h2>}
              {b.note && <p className="mt-0.5 text-sm text-fg/80">{b.note}</p>}
            </header>
          )}
          <Body
            block={b}
            demoId={demoId}
            files={files}
            runs={runs}
            demoExpiresAt={demoExpiresAt}
            now={now}
            storage={storage}
            maxUploadBytes={maxUploadBytes}
          />
        </section>
      ))}
    </div>
  );
}

function Expired({ at }: { at: Date }) {
  return (
    <p className="flex items-center gap-2 text-sm text-fg">
      <StatusChip label="Expiré" tone="bg-fg/10 text-fg border-fg/20" />
      Cet accès a pris fin le {formatDate(at)}. Écrivez-nous pour le prolonger.
    </p>
  );
}

function Body({
  block: b,
  demoId,
  files,
  runs,
  demoExpiresAt,
  now,
  storage,
  maxUploadBytes,
}: {
  block: DemoBlock;
  demoId: number;
  files: FileRow[];
  runs: RunRow[];
  demoExpiresAt: Date | null;
  now: Date;
  storage: boolean;
  maxUploadBytes: number;
}) {
  switch (b.kind) {
    case "link": {
      let host = b.url;
      try {
        host = new URL(b.url).host;
      } catch {
        /* shown as typed */
      }
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <a href={b.url} target="_blank" rel="noopener noreferrer" className={pillPrimary}>
              <Icon name="external" className="size-4" />
              {b.label || "Ouvrir"}
            </a>
            <span className="font-mono text-sm text-fg/80">{host}</span>
          </div>
          {b.embed && (
            <div className="overflow-hidden rounded-2xl border border-fg/10">
              <iframe
                src={b.url}
                title={b.title || host}
                className="aspect-video w-full bg-soft"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                referrerPolicy="no-referrer"
              />
              <p className="border-t border-fg/10 px-4 py-2 text-xs text-fg/80">
                Si l&apos;aperçu reste vide, le site refuse d&apos;être affiché ici — utilisez le bouton
                ci-dessus.
              </p>
            </div>
          )}
        </div>
      );
    }

    case "credentials": {
      const end = effectiveExpiry(demoExpiresAt, b.expiresAt);
      if (isExpired(end, now) && end) return <Expired at={end} />;
      return (
        <div className="flex flex-col gap-3">
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(8rem,auto)_1fr]">
            {b.fields.map((f, i) => (
              <div key={i} className="contents">
                <dt className="pt-1.5 text-sm text-fg/80">{f.label}</dt>
                <dd className="min-w-0">
                  {f.secret ? (
                    <RevealSecret demoId={demoId} blockId={b.id} label={f.label} />
                  ) : f.value && /^https?:\/\//.test(f.value) ? (
                    <a
                      href={f.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all font-mono text-sm font-[650] text-signal-fg underline underline-offset-2"
                    >
                      {f.value}
                    </a>
                  ) : (
                    f.value && <CopyLine value={f.value} label={`Copier ${f.label}`} />
                  )}
                </dd>
              </div>
            ))}
          </dl>
          {end && <p className="text-xs text-fg/80">Valable jusqu&apos;au {formatDate(end)}.</p>}
        </div>
      );
    }

    case "markdown":
      return <Markdown source={b.body} />;

    case "html":
      return (
        // `sandbox=""`: no scripts, no same-origin, no forms, no top navigation.
        // `demos:write` can be handed to one staff member; it must not also be
        // a way to run script in a customer's session.
        <iframe
          sandbox=""
          srcDoc={b.body}
          title={b.title || "Consignes"}
          className="min-h-96 w-full rounded-2xl border border-fg/10 bg-white"
        />
      );

    case "file": {
      const file = files.find((f) => f.id === b.attachmentId);
      if (!file) return <p className="text-sm text-fg/80">Document bientôt disponible.</p>;
      const isPdf = /\.pdf$/i.test(file.filename);
      return (
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/uploads?id=${file.id}`}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-soft px-4 py-3 text-sm text-fg transition-colors hover:bg-fg/8"
          >
            <Icon name="file-text" className="size-5 shrink-0 text-fg/80" />
            <span className="min-w-0 flex-1 truncate font-[650]">{file.filename}</span>
            <span className="text-xs tabular-nums text-fg/80">{formatBytes(file.sizeBytes)}</span>
            <Icon name="download" className="size-4 shrink-0 text-fg/80" />
          </a>
          {isPdf && (
            <a
              href={`/api/uploads?id=${file.id}&inline=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full px-4 py-3 text-sm font-[650] text-fg hover:bg-fg/8"
            >
              Ouvrir
            </a>
          )}
        </div>
      );
    }

    case "ssh": {
      const end = effectiveExpiry(demoExpiresAt, b.expiresAt);
      if (isExpired(end, now) && end) return <Expired at={end} />;
      const port = b.port ?? 22;
      const command =
        b.auth === "key"
          ? `ssh -i ~/.ssh/wicloud-demo -p ${port} ${b.username}@${b.host}`
          : `ssh -p ${port} ${b.username}@${b.host}`;
      return (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
            <dt className="text-fg/80">Hôte</dt>
            <dd className="font-mono text-fg">{b.host}</dd>
            <dt className="text-fg/80">Port</dt>
            <dd className="font-mono text-fg">{port}</dd>
            <dt className="text-fg/80">Utilisateur</dt>
            <dd className="font-mono text-fg">{b.username}</dd>
          </dl>
          <CopyLine value={command} label="Copier la commande SSH" />
          {b.auth !== "none" && (
            <div>
              <p className="mb-1.5 text-sm text-fg/80">
                {b.auth === "key" ? "Clé privée" : "Mot de passe"}
              </p>
              <RevealSecret demoId={demoId} blockId={b.id} label={SSH_SECRET_LABEL} multiline={b.auth === "key"} />
              {b.auth === "key" && (
                <p className="mt-2 text-xs text-fg/80">
                  Enregistrez-la dans <code className="font-mono">~/.ssh/wicloud-demo</code> puis{" "}
                  <code className="font-mono">chmod 600 ~/.ssh/wicloud-demo</code>.
                </p>
              )}
            </div>
          )}
          {end && <p className="text-xs text-fg/80">Accès valable jusqu&apos;au {formatDate(end)}.</p>}
        </div>
      );
    }

    case "upload": {
      const open = runs.find((r) => r.outcome === "en_attente" || r.outcome === "en_cours");
      const done = runs.filter((r) => r !== open);
      return (
        <div className="flex flex-col gap-5">
          <p className="whitespace-pre-wrap text-sm text-fg">{b.prompt}</p>

          {!open && (
            <form action={startDemoRun}>
              <input type="hidden" name="demoId" value={demoId} />
              <button type="submit" className={pillPrimary}>
                <Icon name="upload" className="size-4" />
                {done.length ? "Envoyer un nouveau fichier" : "Commencer"}
              </button>
            </form>
          )}

          {open && (
            <div className="flex flex-col gap-4 rounded-2xl bg-soft p-4">
              <div className="flex items-center gap-2">
                <StatusChip label={RUN_LABELS[open.outcome]} tone={RUN_TONE[open.outcome]} />
                <span className="text-xs text-fg/80">démarré {relativeTime(open.createdAt)}</span>
              </div>
              {open.submitted.length > 0 && <Files files={open.submitted} />}
              {open.outcome === "en_attente" && (
                <>
                  <FileUpload
                    target={{ demoRunId: open.id }}
                    maxBytes={maxUploadBytes}
                    accept={b.accept}
                    hint={b.accept ? b.accept.replaceAll(",", ", ") : "tout document"}
                    disabled={!storage}
                    disabledReason="L'envoi de fichiers n'est pas disponible pour le moment."
                    label={open.submitted.length ? "Ajouter un fichier" : "Choisir un fichier"}
                  />
                  {open.submitted.length > 0 && (
                    <form action={submitDemoRun}>
                      <input type="hidden" name="runId" value={open.id} />
                      <button type="submit" className={pillPrimary}>
                        <Icon name="send" className="size-4" />
                        Envoyer pour traitement
                      </button>
                    </form>
                  )}
                </>
              )}
              {open.outcome === "en_cours" && (
                <p className="text-sm text-fg">
                  Notre équipe traite votre fichier. Vous serez notifié dès que le résultat est prêt.
                </p>
              )}
            </div>
          )}

          {done.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-[650] text-fg">Historique</p>
              {done.map((r) => {
                const result = r.result as DemoResult | null;
                return (
                  <article key={r.id} className="flex flex-col gap-3 rounded-2xl border border-fg/10 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusChip label={RUN_LABELS[r.outcome] ?? r.outcome} tone={RUN_TONE[r.outcome] ?? RUN_TONE.ok} />
                      <span className="text-xs text-fg/80">{formatDate(r.updatedAt)}</span>
                      {result && resultSource(result) === "simulated" && (
                        <StatusChip label="Résultat simulé" tone="bg-fg/5 text-fg border-fg/15" />
                      )}
                    </div>
                    {r.note && <p className="whitespace-pre-wrap text-sm text-fg">{r.note}</p>}
                    {result?.summary && <p className="text-sm text-fg">{result.summary}</p>}
                    {result?.fields?.length ? (
                      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
                        {result.fields.map((f, i) => (
                          <div key={i} className="contents">
                            <dt className="text-fg/80">{f.label}</dt>
                            <dd className="text-fg">{f.value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                    {r.delivered.length > 0 && <Files files={r.delivered} title="Résultat" />}
                    {r.submitted.length > 0 && <Files files={r.submitted} title="Votre envoi" />}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      );
    }
  }
}

function Files({ files, title }: { files: FileRow[]; title?: string }) {
  return (
    <div>
      {title && <p className="mb-1.5 text-xs font-[650] text-fg/80">{title}</p>}
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
    </div>
  );
}
