import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSettings } from "@/lib/db/schema";

/**
 * Platform switches the admin flips from /admin/parametres, stored as one row
 * each in `app_settings` rather than as env vars — an env var needs a redeploy,
 * and these are things that get changed in the middle of a working day.
 */

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

export type Settings = {
  /** Global gate on magic-link sign-in. A user also needs their own flag on. */
  magicLinkEnabled: boolean;
  /** Whether /inscription accepts new accounts at all. */
  registrationOpen: boolean;
  /** Require a verified email before the dashboard opens. */
  requireEmailVerification: boolean;
  /** Shown as a banner across both dashboards. Empty string = no banner. */
  announcement: string;
  company: CompanyIdentity;
};

// (`defaultPlan` used to live here: the plan every new account was handed.
// A subscription is now a service a customer bought, so there is nothing to
// hand out at sign-up. A stale row in `app_settings` is simply ignored.)
export const DEFAULT_SETTINGS: Settings = {
  magicLinkEnabled: false,
  registrationOpen: true,
  requireEmailVerification: false,
  announcement: "",
  company: DEFAULT_COMPANY,
};

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[];

/**
 * Reads every row and merges over the defaults, so a key that has never been
 * written behaves as its default instead of as `undefined`.
 *
 * Not cached: these are read once per dashboard request and a stale switch is
 * worse than a query. `unstable_cache` would also have to be invalidated from
 * the settings action, which is more machinery than the query costs.
 */
export async function getSettings(): Promise<Settings> {
  try {
    const rows = await db.select().from(appSettings);
    const out = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if ((SETTING_KEYS as string[]).includes(row.key)) {
        (out as Record<string, unknown>)[row.key] = row.value;
      }
    }
    return out;
  } catch {
    // Before the first migration there is no table. Falling back to the
    // defaults keeps /connexion renderable instead of 500-ing on a fresh clone.
    return { ...DEFAULT_SETTINGS };
  }
}

export async function getSetting<K extends keyof Settings>(key: K): Promise<Settings[K]> {
  try {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
    return (row?.value as Settings[K]) ?? DEFAULT_SETTINGS[key];
  } catch {
    return DEFAULT_SETTINGS[key];
  }
}

export async function setSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K],
  updatedById?: string,
): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value, updatedById })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedById, updatedAt: new Date() },
    });
}

/** The company identity with every field present, even ones added after it was saved. */
export async function getCompany(): Promise<CompanyIdentity> {
  const stored = await getSetting("company");
  return { ...DEFAULT_COMPANY, ...(stored ?? {}) };
}
