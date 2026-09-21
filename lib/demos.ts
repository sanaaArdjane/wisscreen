import { z } from "zod";

/**
 * What a demo *is*: an ordered list of blocks the admin composes.
 *
 * WICLOUD is a services agency, so a demo is something the owner **hands a
 * named customer** so they can evaluate a service: a link to a live platform
 * and the test account to log in with; a sandbox with an expiry; an
 * instructions PDF; SSH access to a server; or "send us a file and we'll run it
 * through the engine and send you the result". The previous version modelled a
 * demo as four hard-coded functions that hashed the visitor's input into
 * plausible-looking output, which was the opposite of what the owner sells.
 *
 * **Adding a block kind** is a type member, a Zod member, an editor case
 * (`app/(app)/admin/demos/DemoEditor.tsx`) and a renderer case
 * (`components/dashboard/demos/DemoBlocks.tsx`). It is never a migration: the
 * blocks are one jsonb column, the same shape `quotes.lines` already uses.
 *
 * **Secret values never live in a block.** A credentials row marked `secret`
 * and an SSH block's password or key keep only their *label* here; the value is
 * encrypted into `demo_secrets` and fetched one at a time, on click, through
 * `/api/demos/secret`. The blocks array goes to client components and admin
 * lists wholesale, so anything in it should be assumed visible.
 */

/* ───────────────────────────────── Blocks ───────────────────────────────── */

const base = {
  /** Minted by the editor with `crypto.randomUUID()` when the block is added —
   *  never the index. `demo_secrets.block_id` points at it, so reordering must
   *  not change which server a password belongs to. */
  id: z.string().min(8).max(64),
  title: z.string().trim().max(160).optional(),
  /** A line of context under the title. */
  note: z.string().trim().max(2000).optional(),
};

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Adresse http(s) complète attendue.");

export const LinkBlockSchema = z.object({
  ...base,
  kind: z.literal("link"),
  url: httpUrl,
  label: z.string().trim().max(120).optional(),
  /** Show the site in a frame as well as the link. The link always stays. */
  embed: z.boolean().optional(),
});

export const CredentialsBlockSchema = z.object({
  ...base,
  kind: z.literal("credentials"),
  /** `secret: true` rows carry no `value` here — see the header. */
  fields: z
    .array(
      z.object({
        label: z.string().trim().min(1, "Libellé requis.").max(80),
        value: z.string().max(2000).optional(),
        secret: z.boolean().optional(),
      }),
    )
    .max(20),
  /** ISO date. After it, the block says "expiré" and secrets stop revealing. */
  expiresAt: z.string().optional(),
});

export const MarkdownBlockSchema = z.object({
  ...base,
  kind: z.literal("markdown"),
  body: z.string().max(50_000),
});

export const HtmlBlockSchema = z.object({
  ...base,
  kind: z.literal("html"),
  /** Rendered in `<iframe sandbox="">` — no scripts, no same-origin. */
  body: z.string().max(200_000),
});

export const FileBlockSchema = z.object({
  ...base,
  kind: z.literal("file"),
  /** An `attachments` row with `demo_id` = this demo. Checked server-side on save. */
  attachmentId: z.number().int().positive().optional(),
  filename: z.string().max(200).optional(),
});

export const SshBlockSchema = z.object({
  ...base,
  kind: z.literal("ssh"),
  host: z.string().trim().min(1, "Hôte requis.").max(255),
  port: z.number().int().min(1).max(65535).optional(),
  username: z.string().trim().min(1, "Utilisateur requis.").max(64),
  /** `password` / `key`: a secret is stored under the label `ssh`. `none`: agent
   *  or certificate auth arranged elsewhere, nothing to reveal. */
  auth: z.enum(["password", "key", "none"]),
  expiresAt: z.string().optional(),
});

export const UploadBlockSchema = z.object({
  ...base,
  kind: z.literal("upload"),
  /** What to send, in the owner's words — "une facture scannée, PDF ou photo". */
  prompt: z.string().trim().min(1, "Consigne requise.").max(2000),
  /** Shown to the customer and used as the file input's `accept`. */
  accept: z.string().trim().max(200).optional(),
  /** `manual`: a human processes it and replies. `engine`: reserved for when an
   *  engine is wired in; today it behaves exactly like manual. */
  processedBy: z.enum(["manual", "engine"]).default("manual"),
});

export const DemoBlockSchema = z.discriminatedUnion("kind", [
  LinkBlockSchema,
  CredentialsBlockSchema,
  MarkdownBlockSchema,
  HtmlBlockSchema,
  FileBlockSchema,
  SshBlockSchema,
  UploadBlockSchema,
]);

export type DemoBlock = z.infer<typeof DemoBlockSchema>;
export type BlockKind = DemoBlock["kind"];
export type LinkBlock = z.infer<typeof LinkBlockSchema>;
export type CredentialsBlock = z.infer<typeof CredentialsBlockSchema>;
export type SshBlock = z.infer<typeof SshBlockSchema>;
export type UploadBlock = z.infer<typeof UploadBlockSchema>;

export const BLOCK_KINDS: BlockKind[] = [
  "link",
  "credentials",
  "markdown",
  "html",
  "file",
  "ssh",
  "upload",
];

export const BLOCK_LABELS: Record<BlockKind, { label: string; hint: string }> = {
  link: { label: "Lien", hint: "Une plateforme en ligne, un espace de test" },
  credentials: { label: "Identifiants", hint: "Comptes de test, codes, URL de connexion" },
  markdown: { label: "Texte (Markdown)", hint: "Consignes, étapes, explications" },
  html: { label: "HTML", hint: "Une page de consignes déjà mise en forme" },
  file: { label: "Fichier", hint: "Un PDF ou un document à télécharger" },
  ssh: { label: "Accès SSH", hint: "Un serveur, avec mot de passe ou clé" },
  upload: { label: "Dépôt de fichier", hint: "Le client envoie un fichier, vous le traitez" },
};

/** The secret label an SSH block stores its credential under. */
export const SSH_SECRET_LABEL = "ssh";

/** Every (blockId, label) pair a demo's blocks declare as secret. */
export function declaredSecrets(blocks: DemoBlock[]): { blockId: string; label: string }[] {
  const out: { blockId: string; label: string }[] = [];
  for (const b of blocks) {
    if (b.kind === "credentials") {
      for (const f of b.fields) if (f.secret) out.push({ blockId: b.id, label: f.label });
    } else if (b.kind === "ssh" && b.auth !== "none") {
      out.push({ blockId: b.id, label: SSH_SECRET_LABEL });
    }
  }
  return out;
}

/** Parse a stored `demos.blocks` value, dropping anything that no longer fits
 *  the schema rather than crashing the page on one bad block. */
export function parseBlocks(raw: unknown): DemoBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: DemoBlock[] = [];
  for (const item of raw) {
    const parsed = DemoBlockSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/* ─────────────────────────────── Vocabulary ─────────────────────────────── */

export const DEMO_STATUSES = ["brouillon", "publie", "archive"] as const;
export type DemoStatus = (typeof DEMO_STATUSES)[number];

export const DEMO_LABELS: Record<DemoStatus, string> = {
  brouillon: "Brouillon",
  publie: "Publiée",
  archive: "Archivée",
};

/** Same rule as `QUOTE_TONE`: colour in the fill and border, label in `fg`. */
export const DEMO_TONE: Record<DemoStatus, string> = {
  brouillon: "bg-fg/5 text-fg border-fg/15",
  publie: "bg-signal/15 text-fg border-signal/45",
  archive: "bg-fg/5 text-fg border-fg/15",
};

export const VISIBILITY_LABELS = {
  assigned: "Clients autorisés uniquement",
  all_clients: "Tous les clients",
} as const;
export type DemoVisibility = keyof typeof VISIBILITY_LABELS;

export const RUN_LABELS: Record<string, string> = {
  en_attente: "En attente de fichier",
  en_cours: "En cours de traitement",
  ok: "Traitée",
  error: "Échec",
  quota: "Quota atteint (ancien système)",
};

export const RUN_TONE: Record<string, string> = {
  en_attente: "bg-fg/5 text-fg border-fg/15",
  en_cours: "bg-signal/15 text-fg border-signal/45",
  ok: "bg-teal/15 text-fg border-teal/40",
  error: "bg-danger/10 text-fg border-danger/45",
  quota: "bg-fg/5 text-fg border-fg/15",
};

/* ──────────────────────────────── Results ──────────────────────────────── */

export type DemoField = { label: string; value: string; confidence?: number };

export type DemoResultSource = "simulated" | "manual" | "engine";

/**
 * What a processed run says back. Stored in `demo_runs.result`.
 *
 * `simulated` used to be the literal type `true` — which is exactly why no real
 * engine could ever have set it. It stays readable for rows the old simulator
 * wrote; `source` supersedes it, and `resultSource` is the only reader.
 */
export type DemoResult = {
  summary: string;
  fields: DemoField[];
  source?: DemoResultSource;
  /** @deprecated legacy rows only — use `resultSource`. */
  simulated?: boolean;
};

export function resultSource(r: Pick<DemoResult, "source" | "simulated">): DemoResultSource {
  return r.source ?? (r.simulated === false ? "engine" : "simulated");
}

/* ──────────────────────────────── Expiry ──────────────────────────────── */

/**
 * The effective end of access: the earliest of the demo's own expiry, the
 * grant's, and — for a block that has one — the block's. Derived here rather
 * than in a page, for the reason `isQuoteExpired` lives in `lib/billing.ts`:
 * the caller passes `now`, so no component calls `Date.now()` while rendering.
 */
export function effectiveExpiry(
  ...dates: (Date | string | null | undefined)[]
): Date | null {
  let min: Date | null = null;
  for (const d of dates) {
    if (!d) continue;
    const date = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(date.getTime())) continue;
    if (!min || date < min) min = date;
  }
  return min;
}

export function isExpired(expiry: Date | null, now: Date): boolean {
  return expiry !== null && expiry.getTime() <= now.getTime();
}

/** URL-safe slug from a title, for the editor's suggestion. */
export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
