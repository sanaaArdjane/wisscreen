"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Button } from "@heroui/react";
import {
  Field,
  FormAlert,
  SelectField,
  SubmitButton,
  TextAreaField,
  type Option,
} from "@/components/dashboard/ui";
import { FileUpload } from "@/components/dashboard/FileUpload";
import { Icon } from "@/components/ui/Icon";
import { Markdown } from "@/lib/markdown";
import { cn } from "@/lib/cn";
import { IDLE, type ActionState } from "@/lib/actions";
import {
  BLOCK_KINDS,
  BLOCK_LABELS,
  DEMO_LABELS,
  DEMO_STATUSES,
  SSH_SECRET_LABEL,
  VISIBILITY_LABELS,
  slugify,
  type BlockKind,
  type DemoBlock,
} from "@/lib/demos";
import { saveDemo } from "./actions";

/**
 * The demo editor — one form for "nouvelle" and "modifier".
 *
 * **Why each block posts itself as JSON** (and not the devis editor's parallel
 * arrays) is written on `saveDemo`. The short version: blocks don't share
 * fields, so index-zipping them silently misaligns. Don't "simplify" this back.
 *
 * This is the one dashboard form that needs JavaScript to submit correctly,
 * and that is accepted: it is an authoring surface behind a login. Every form
 * a *customer* sees is still a plain `<form action>`.
 *
 * **Secrets.** A credentials row marked secret, and an SSH block's password or
 * key, show a password field. Typing in it queues a `secret` input; leaving it
 * blank keeps whatever is stored. The value is never written into the block —
 * the server strips it even if it were — and nothing already stored is ever
 * sent back to this page: it only knows *that* a secret is set.
 */

type Meta = {
  demoId?: number;
  title?: string;
  slug?: string;
  summary?: string | null;
  category?: string | null;
  serviceSlug?: string | null;
  status?: string;
  visibility?: string;
  expiresAt?: string;
};

function newId(): string {
  return crypto.randomUUID();
}

function blank(kind: BlockKind): DemoBlock {
  const id = newId();
  switch (kind) {
    case "link":
      return { id, kind, url: "https://", label: "Ouvrir la plateforme" };
    case "credentials":
      return {
        id,
        kind,
        title: "Compte de démonstration",
        fields: [
          { label: "Identifiant", value: "" },
          { label: "Mot de passe", secret: true },
        ],
      };
    case "markdown":
      return { id, kind, body: "## Étapes\n\n1. Connectez-vous avec le compte ci-dessus\n2. …" };
    case "html":
      return { id, kind, body: "<h2>Consignes</h2>\n<p>…</p>" };
    case "file":
      return { id, kind, title: "Guide d'accès" };
    case "ssh":
      return { id, kind, title: "Serveur de démonstration", host: "", port: 22, username: "demo", auth: "password" };
    case "upload":
      return {
        id,
        kind,
        title: "Envoyez-nous un fichier",
        prompt: "Déposez un document (PDF ou photo) : nous le traitons et vous renvoyons le résultat.",
        accept: ".pdf,.png,.jpg,.jpeg",
        processedBy: "manual",
      };
  }
}

const inputCls =
  "w-full rounded-2xl bg-soft px-3 py-2.5 text-sm text-fg placeholder:text-fg/80 focus:outline-none focus:ring-2 focus:ring-fg";

function L({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="text-sm text-fg/80">{label}</span>
      {children}
    </label>
  );
}

export function DemoEditor({
  meta = {},
  initialBlocks = [],
  storedSecrets = [],
  files = [],
  services,
  encryption,
  storage,
  maxUploadBytes,
}: {
  meta?: Meta;
  initialBlocks?: DemoBlock[];
  /** `blockId:label` pairs that already have a value. Never the values. */
  storedSecrets?: string[];
  /** Files uploaded onto this demo, for file blocks to point at. */
  files?: { id: number; filename: string }[];
  services: Option[];
  encryption: boolean;
  storage: boolean;
  maxUploadBytes: number;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveDemo, IDLE);
  const [blocks, setBlocks] = useState<DemoBlock[]>(initialBlocks);
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [title, setTitle] = useState(meta.title ?? "");
  const [slug, setSlug] = useState(meta.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(meta.slug));
  const stored = new Set(storedSecrets);

  function update(id: string, patch: Partial<DemoBlock>) {
    setBlocks((all) => all.map((b) => (b.id === id ? ({ ...b, ...patch } as DemoBlock) : b)));
  }
  function move(id: string, dir: -1 | 1) {
    setBlocks((all) => {
      const i = all.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= all.length) return all;
      const next = [...all];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function remove(id: string) {
    setBlocks((all) => all.filter((b) => b.id !== id));
    setSecrets((all) => Object.fromEntries(Object.entries(all).filter(([k]) => !k.startsWith(`${id}:`))));
  }
  function setSecret(blockId: string, label: string, value: string) {
    setSecrets((all) => ({ ...all, [`${blockId}:${label}`]: value }));
  }

  const secretInputs = Object.entries(secrets)
    .filter(([, v]) => v.length > 0)
    .map(([k, value]) => {
      const i = k.indexOf(":");
      return { blockId: k.slice(0, i), label: k.slice(i + 1), value };
    });

  return (
    <form action={action} className="flex flex-col gap-8">
      {meta.demoId && <input type="hidden" name="demoId" value={meta.demoId} />}
      {blocks.map((b) => (
        <input key={b.id} type="hidden" name="block" value={JSON.stringify(b)} />
      ))}
      {secretInputs.map((s) => (
        <input key={`${s.blockId}:${s.label}`} type="hidden" name="secret" value={JSON.stringify(s)} />
      ))}

      <FormAlert state={state} />

      {/* ─────────────── The demo itself ─────────────── */}
      <section className="grid gap-5 sm:grid-cols-2">
        <L label="Titre" className="sm:col-span-2">
          <input
            name="title"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugTouched) setSlug(slugify(e.target.value));
            }}
            placeholder="SETYCORE — espace marchand de test"
            className={inputCls}
          />
          {state.fieldErrors?.title && <span className="text-xs text-fg">{state.fieldErrors.title}</span>}
        </L>
        <L label="Adresse (slug)">
          <input
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="setycore-marchand"
            className={cn(inputCls, "font-mono")}
          />
          <span className="text-xs text-fg/80">
            {state.fieldErrors?.slug ?? `/dashboard/demos/${slug || "…"}`}
          </span>
        </L>
        <Field
          name="category"
          label="Catégorie"
          placeholder="Plateforme, Sandbox, Serveur, OCR…"
          defaultValue={state.values?.category ?? meta.category ?? ""}
          description="Libre. Sert d'étiquette et de filtre."
        />
        <SelectField
          name="serviceSlug"
          label="Solution liée"
          options={[{ value: "", label: "Aucune" }, ...services]}
          defaultValue={state.values?.serviceSlug ?? meta.serviceSlug ?? ""}
        />
        <Field
          name="expiresAt"
          label="Disponible jusqu'au"
          type="date"
          defaultValue={state.values?.expiresAt ?? meta.expiresAt ?? ""}
          description="Facultatif. Un accès client peut raccourcir ce délai, jamais l'allonger."
        />
        <SelectField
          name="status"
          label="Statut"
          options={DEMO_STATUSES.map((s) => ({ value: s, label: DEMO_LABELS[s] }))}
          defaultValue={state.values?.status ?? meta.status ?? "brouillon"}
          description="Seule une démo publiée est visible des clients."
        />
        <SelectField
          name="visibility"
          label="Visible par"
          options={Object.entries(VISIBILITY_LABELS).map(([value, label]) => ({ value, label }))}
          defaultValue={state.values?.visibility ?? meta.visibility ?? "assigned"}
        />
        <TextAreaField
          name="summary"
          label="Présentation"
          description="Affichée sur la carte de la démo, côté client."
          defaultValue={state.values?.summary ?? meta.summary ?? ""}
          rows={3}
          className="sm:col-span-2"
        />
      </section>

      {/* ─────────────── Blocks ─────────────── */}
      <section className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-[650] text-fg">Contenu</h2>
          <p className="text-sm text-fg/80">
            Composez la démo avec autant de blocs que nécessaire, dans l&apos;ordre où le client
            les verra : un lien et ses identifiants, un guide PDF, un accès SSH, un dépôt de
            fichier…
          </p>
        </div>

        {blocks.length === 0 && (
          <p className="rounded-3xl border border-dashed border-fg/25 px-6 py-10 text-center text-sm text-fg/80">
            Aucun bloc pour l&apos;instant. Ajoutez-en un ci-dessous.
          </p>
        )}

        {blocks.map((b, index) => (
          <article key={b.id} className="rounded-3xl border border-fg/15 bg-panel">
            <header className="flex items-center gap-2 border-b border-fg/10 px-5 py-3">
              <span className="rounded-full bg-soft px-3 py-1 text-xs font-[650] text-fg">
                {BLOCK_LABELS[b.kind].label}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-fg/80">{b.title}</span>
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label="Monter"
                isDisabled={index === 0}
                onPress={() => move(b.id, -1)}
              >
                <Icon name="chevron-down" className="size-4 rotate-180" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label="Descendre"
                isDisabled={index === blocks.length - 1}
                onPress={() => move(b.id, 1)}
              >
                <Icon name="chevron-down" className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="danger-soft"
                isIconOnly
                aria-label={`Supprimer le bloc ${index + 1}`}
                onPress={() => remove(b.id)}
              >
                <Icon name="trash" className="size-4 text-danger-fg" />
              </Button>
            </header>

            <div className="flex flex-col gap-4 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <L label="Titre du bloc">
                  <input
                    value={b.title ?? ""}
                    onChange={(e) => update(b.id, { title: e.target.value || undefined })}
                    className={inputCls}
                  />
                </L>
                <L label="Précision (facultatif)">
                  <input
                    value={b.note ?? ""}
                    onChange={(e) => update(b.id, { note: e.target.value || undefined })}
                    className={inputCls}
                  />
                </L>
              </div>

              <BlockBody
                block={b}
                update={(patch) => update(b.id, patch)}
                stored={stored}
                secrets={secrets}
                setSecret={setSecret}
                encryption={encryption}
                files={files}
                demoId={meta.demoId}
                storage={storage}
                maxUploadBytes={maxUploadBytes}
              />
            </div>
          </article>
        ))}

        <div className="rounded-3xl bg-soft p-4">
          <p className="mb-3 text-sm font-[650] text-fg">Ajouter un bloc</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {BLOCK_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setBlocks((all) => [...all, blank(kind)])}
                className="flex flex-col items-start gap-0.5 rounded-2xl bg-panel px-4 py-3 text-left transition-colors hover:bg-fg/8"
              >
                <span className="flex items-center gap-2 text-sm font-[650] text-fg">
                  <Icon name="plus" className="size-3.5" />
                  {BLOCK_LABELS[kind].label}
                </span>
                <span className="text-xs text-fg/80">{BLOCK_LABELS[kind].hint}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-fg/10 pt-6">
        <SubmitButton>{meta.demoId ? "Enregistrer la démo" : "Créer la démo"}</SubmitButton>
        {secretInputs.length > 0 && (
          <span className="text-sm text-fg/80">
            {secretInputs.length} identifiant{secretInputs.length > 1 ? "s" : ""} secret
            {secretInputs.length > 1 ? "s" : ""} sera chiffré à l&apos;enregistrement.
          </span>
        )}
      </div>
    </form>
  );
}

function SecretField({
  blockId,
  label,
  stored,
  secrets,
  setSecret,
  encryption,
  multiline,
  placeholder,
}: {
  blockId: string;
  label: string;
  stored: Set<string>;
  secrets: Record<string, string>;
  setSecret: (blockId: string, label: string, value: string) => void;
  encryption: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  const key = `${blockId}:${label}`;
  const isStored = stored.has(key);
  if (!encryption) {
    return (
      <p className="rounded-2xl border border-fg/25 px-3 py-2.5 text-xs text-fg">
        Définissez <code className="font-mono">ENCRYPTION_KEY</code> pour stocker des identifiants
        secrets. Rien n&apos;est jamais enregistré en clair.
      </p>
    );
  }
  const common = {
    value: secrets[key] ?? "",
    onChange: (e: { target: { value: string } }) => setSecret(blockId, label, e.target.value),
    placeholder: isStored ? "•••••••• (enregistré — saisir pour remplacer)" : (placeholder ?? "Valeur secrète"),
    autoComplete: "new-password",
    className: cn(inputCls, "font-mono"),
  };
  return multiline ? <textarea rows={5} spellCheck={false} {...common} /> : <input type="password" {...common} />;
}

function BlockBody({
  block: b,
  update,
  stored,
  secrets,
  setSecret,
  encryption,
  files,
  demoId,
  storage,
  maxUploadBytes,
}: {
  block: DemoBlock;
  update: (patch: Partial<DemoBlock>) => void;
  stored: Set<string>;
  secrets: Record<string, string>;
  setSecret: (blockId: string, label: string, value: string) => void;
  encryption: boolean;
  files: { id: number; filename: string }[];
  demoId?: number;
  storage: boolean;
  maxUploadBytes: number;
}) {
  const [preview, setPreview] = useState(false);

  switch (b.kind) {
    case "link":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <L label="Adresse" className="sm:col-span-2">
            <input
              value={b.url}
              onChange={(e) => update({ url: e.target.value })}
              placeholder="https://demo.setycore.com"
              className={cn(inputCls, "font-mono")}
            />
          </L>
          <L label="Texte du bouton">
            <input value={b.label ?? ""} onChange={(e) => update({ label: e.target.value || undefined })} className={inputCls} />
          </L>
          <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-fg">
            <input
              type="checkbox"
              checked={Boolean(b.embed)}
              onChange={(e) => update({ embed: e.target.checked || undefined })}
              className="size-4 accent-current"
            />
            Afficher aussi le site dans la page
          </label>
        </div>
      );

    case "credentials":
      return (
        <div className="flex flex-col gap-3">
          {b.fields.map((f, i) => (
            <div key={i} className="grid items-end gap-3 sm:grid-cols-[12rem_1fr_auto_auto]">
              <L label="Libellé">
                <input
                  value={f.label}
                  onChange={(e) => {
                    const fields = [...b.fields];
                    fields[i] = { ...f, label: e.target.value };
                    update({ fields });
                  }}
                  className={inputCls}
                />
              </L>
              <L label={f.secret ? "Valeur (chiffrée)" : "Valeur"}>
                {f.secret ? (
                  <SecretField
                    blockId={b.id}
                    label={f.label}
                    stored={stored}
                    secrets={secrets}
                    setSecret={setSecret}
                    encryption={encryption}
                  />
                ) : (
                  <input
                    value={f.value ?? ""}
                    onChange={(e) => {
                      const fields = [...b.fields];
                      fields[i] = { ...f, value: e.target.value };
                      update({ fields });
                    }}
                    className={cn(inputCls, "font-mono")}
                  />
                )}
              </L>
              <label className="flex items-center gap-2 pb-2.5 text-sm text-fg">
                <input
                  type="checkbox"
                  checked={Boolean(f.secret)}
                  onChange={(e) => {
                    const fields = [...b.fields];
                    fields[i] = e.target.checked ? { label: f.label, secret: true } : { label: f.label, value: "" };
                    update({ fields });
                  }}
                  className="size-4"
                />
                Secret
              </label>
              <Button
                size="sm"
                variant="danger-soft"
                isIconOnly
                aria-label={`Supprimer la ligne ${f.label}`}
                onPress={() => update({ fields: b.fields.filter((_, j) => j !== i) })}
                className="mb-1"
              >
                <Icon name="trash" className="size-4 text-danger-fg" />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap items-end gap-4">
            <Button
              variant="ghost"
              onPress={() => update({ fields: [...b.fields, { label: "", value: "" }] })}
            >
              <Icon name="plus" className="size-4" />
              Ajouter une ligne
            </Button>
            <L label="Expire le">
              <input
                type="date"
                value={b.expiresAt?.slice(0, 10) ?? ""}
                onChange={(e) => update({ expiresAt: e.target.value || undefined })}
                className={inputCls}
              />
            </L>
          </div>
          <p className="text-xs text-fg/80">
            Les lignes « secret » sont chiffrées et ne s&apos;affichent qu&apos;au clic, avec une trace dans le
            journal. Les autres (identifiant, URL de connexion) sont visibles directement.
          </p>
        </div>
      );

    case "markdown":
      return (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button size="sm" variant={preview ? "ghost" : "secondary"} onPress={() => setPreview(false)}>
              Écrire
            </Button>
            <Button size="sm" variant={preview ? "secondary" : "ghost"} onPress={() => setPreview(true)}>
              Aperçu
            </Button>
          </div>
          {preview ? (
            <div className="min-h-40 rounded-2xl border border-fg/10 p-4">
              <Markdown source={b.body} />
            </div>
          ) : (
            <textarea
              rows={10}
              value={b.body}
              onChange={(e) => update({ body: e.target.value })}
              className={cn(inputCls, "font-mono")}
            />
          )}
          <p className="text-xs text-fg/80">
            Titres <code>##</code>, listes <code>-</code> ou <code>1.</code>, <code>**gras**</code>,{" "}
            <code>`code`</code>, blocs <code>```</code> et liens <code>[texte](https://…)</code>.
          </p>
        </div>
      );

    case "html":
      return (
        <div className="flex flex-col gap-2">
          <textarea
            rows={10}
            value={b.body}
            onChange={(e) => update({ body: e.target.value })}
            spellCheck={false}
            className={cn(inputCls, "font-mono")}
          />
          <p className="text-xs text-fg/80">
            Affiché dans un cadre isolé : la mise en forme est conservée, les scripts ne
            s&apos;exécutent pas.
          </p>
        </div>
      );

    case "file":
      return (
        <div className="flex flex-col gap-3">
          {files.length > 0 ? (
            <L label="Fichier">
              <select
                value={b.attachmentId ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value) || undefined;
                  update({ attachmentId: id, filename: files.find((f) => f.id === id)?.filename });
                }}
                className={inputCls}
              >
                <option value="">— Choisir —</option>
                {files.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.filename}
                  </option>
                ))}
              </select>
            </L>
          ) : (
            <p className="text-sm text-fg/80">Aucun fichier sur cette démo pour l&apos;instant.</p>
          )}
          {demoId ? (
            <FileUpload
              target={{ demoId }}
              maxBytes={maxUploadBytes}
              disabled={!storage}
              disabledReason="Le stockage de fichiers n'est pas configuré."
              label="Téléverser un fichier"
              hint="PDF, Markdown, HTML, images, documents Office."
              onUploaded={(f) => update({ attachmentId: f.id, filename: f.filename })}
            />
          ) : (
            <p className="text-xs text-fg/80">Enregistrez d&apos;abord la démo pour y téléverser un fichier.</p>
          )}
        </div>
      );

    case "ssh":
      return (
        <div className="grid gap-4 sm:grid-cols-[1fr_7rem_1fr]">
          <L label="Hôte">
            <input
              value={b.host}
              onChange={(e) => update({ host: e.target.value })}
              placeholder="demo.wicloud.dz ou 203.0.113.10"
              className={cn(inputCls, "font-mono")}
            />
          </L>
          <L label="Port">
            <input
              inputMode="numeric"
              value={b.port ?? ""}
              onChange={(e) => update({ port: Number(e.target.value) || undefined })}
              className={cn(inputCls, "font-mono")}
            />
          </L>
          <L label="Utilisateur">
            <input
              value={b.username}
              onChange={(e) => update({ username: e.target.value })}
              className={cn(inputCls, "font-mono")}
            />
          </L>
          <L label="Authentification">
            <select
              value={b.auth}
              onChange={(e) => update({ auth: e.target.value as "password" | "key" | "none" })}
              className={inputCls}
            >
              <option value="password">Mot de passe</option>
              <option value="key">Clé privée</option>
              <option value="none">Aucune à fournir</option>
            </select>
          </L>
          <L label="Expire le">
            <input
              type="date"
              value={b.expiresAt?.slice(0, 10) ?? ""}
              onChange={(e) => update({ expiresAt: e.target.value || undefined })}
              className={inputCls}
            />
          </L>
          <div />
          {b.auth !== "none" && (
            <L label={b.auth === "key" ? "Clé privée (chiffrée)" : "Mot de passe (chiffré)"} className="sm:col-span-3">
              <SecretField
                blockId={b.id}
                label={SSH_SECRET_LABEL}
                stored={stored}
                secrets={secrets}
                setSecret={setSecret}
                encryption={encryption}
                multiline={b.auth === "key"}
                placeholder={b.auth === "key" ? "-----BEGIN OPENSSH PRIVATE KEY-----" : "Mot de passe"}
              />
            </L>
          )}
        </div>
      );

    case "upload":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <L label="Consigne au client" className="sm:col-span-2">
            <textarea
              rows={3}
              value={b.prompt}
              onChange={(e) => update({ prompt: e.target.value })}
              className={inputCls}
            />
          </L>
          <L label="Types acceptés">
            <input
              value={b.accept ?? ""}
              onChange={(e) => update({ accept: e.target.value || undefined })}
              placeholder=".pdf,.png,.jpg"
              className={cn(inputCls, "font-mono")}
            />
          </L>
          <L label="Traitement">
            <select
              value={b.processedBy}
              onChange={(e) => update({ processedBy: e.target.value as "manual" | "engine" })}
              className={inputCls}
            >
              <option value="manual">Par notre équipe</option>
              <option value="engine">Automatique (moteur à venir)</option>
            </select>
          </L>
          <p className="text-xs text-fg/80 sm:col-span-2">
            Chaque envoi du client arrive dans « Exécutions » ci-dessous, avec une notification : vous
            y joignez le résultat et le client est prévenu.
          </p>
        </div>
      );
  }
}
