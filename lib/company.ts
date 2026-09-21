import { z } from "zod";

/**
 * Who WICLOUD is on paper: the header, footer and signature of every devis and
 * facture PDF. One setting holding an object rather than twenty keys, because
 * it is edited as one form and read as one thing.
 *
 * The logo and signature are **attachment ids**, not URLs or keys: the files
 * live in the private bucket like every other upload, the PDF renderer reads
 * their bytes server-side, and the settings page previews them through the
 * same authorised `/api/uploads` route. PNG or JPEG only — the PDF engine
 * cannot embed WebP or GIF.
 */
export type CompanyIdentity = {
  name: string;
  legalForm: string;
  capital: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  /** Registre du commerce. */
  rc: string;
  nif: string;
  nis: string;
  /** Article d'imposition. */
  ai: string;
  bank: string;
  rib: string;
  logoAttachmentId: number | null;
  signatureAttachmentId: number | null;
  signatoryName: string;
  signatoryTitle: string;
  /** Percent. 0 hides the tax lines entirely. Line prices are always HT. */
  vatRate: number;
  quoteTerms: string;
  invoiceTerms: string;
  footerNote: string;
};

export const DEFAULT_COMPANY: CompanyIdentity = {
  name: "WICLOUD",
  legalForm: "",
  capital: "",
  address: "",
  city: "",
  country: "Algérie",
  phone: "",
  email: "",
  website: "",
  rc: "",
  nif: "",
  nis: "",
  ai: "",
  bank: "",
  rib: "",
  logoAttachmentId: null,
  signatureAttachmentId: null,
  signatoryName: "",
  signatoryTitle: "",
  vatRate: 0,
  quoteTerms: "Devis valable 30 jours. Toute commande implique l'acceptation des présentes conditions.",
  invoiceTerms: "Paiement à réception de facture, par virement bancaire.",
  footerNote: "",
};

/** The company fields a single devis or facture may override. All of them. */
export type CompanyOverrides = Partial<CompanyIdentity>;

export const COMPANY_KEYS = Object.keys(DEFAULT_COMPANY) as (keyof CompanyIdentity)[];

/**
 * What a document actually prints: the Paramètres identity, with the
 * document's own overrides on top. A key that is absent (or `undefined`)
 * falls back; any present value — including an empty string, which blanks a
 * line on this one document — wins.
 */
export function effectiveCompany(
  base: CompanyIdentity,
  overrides: CompanyOverrides | null | undefined,
): CompanyIdentity {
  const out = { ...base };
  for (const key of COMPANY_KEYS) {
    const v = overrides?.[key];
    if (v !== undefined) (out as Record<string, unknown>)[key] = v;
  }
  return out;
}

/* ───────────────────────── Validating an override ───────────────────────── */


const t = (max: number) => z.string().max(max);

/**
 * What a document editor may post as overrides. Every key optional; unknown
 * keys dropped. Image ids are checked to be PNG/JPEG attachments by the action.
 */
export const CompanyOverridesSchema = z
  .object({
    name: t(160),
    legalForm: t(60),
    capital: t(60),
    address: t(300),
    city: t(120),
    country: t(80),
    phone: t(60),
    email: t(320),
    website: t(200),
    rc: t(60),
    nif: t(60),
    nis: t(60),
    ai: t(60),
    bank: t(120),
    rib: t(80),
    logoAttachmentId: z.number().int().positive().nullable(),
    signatureAttachmentId: z.number().int().positive().nullable(),
    signatoryName: t(120),
    signatoryTitle: t(120),
    vatRate: z.number().min(0).max(100),
    quoteTerms: t(3000),
    invoiceTerms: t(3000),
    footerNote: t(1000),
  })
  .partial();

/** Parse the editor's hidden `overrides` input. Bad JSON or values → an error message. */
export function parseOverrides(raw: FormDataEntryValue | null):
  | { ok: true; overrides: CompanyOverrides }
  | { ok: false; error: string } {
  if (raw === null || raw === "") return { ok: true, overrides: {} };
  let json: unknown;
  try {
    json = JSON.parse(String(raw));
  } catch {
    return { ok: false, error: "Les informations de l'émetteur sont illisibles — rechargez la page." };
  }
  const parsed = CompanyOverridesSchema.safeParse(json);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: `Émetteur : ${issue?.path.join(".") ?? ""} invalide.` };
  }
  return { ok: true, overrides: parsed.data };
}
