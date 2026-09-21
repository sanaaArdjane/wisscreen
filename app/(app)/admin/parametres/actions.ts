"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/guard";
import { DEFAULT_COMPANY, setSetting } from "@/lib/settings";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments } from "@/lib/db/schema";
import { logActivity } from "@/lib/account";
import { checkbox, fail, parseForm, succeed, type ActionState } from "@/lib/actions";

const SettingsSchema = z.object({
  magicLinkEnabled: checkbox,
  registrationOpen: checkbox,
  requireEmailVerification: checkbox,
  announcement: z.string().trim().max(240),
});

/**
 * Platform switches.
 *
 * Each key is written individually rather than as one JSON blob, so
 * `app_settings` stays queryable one row at a time — `getSetting("magicLinkEnabled")`
 * is one lookup, not a parse of the whole document.
 *
 * Every checkbox posts (`checkbox` treats a missing key as false), so a submit is
 * the complete state of the form: unticking a box turns the switch off rather
 * than leaving it untouched.
 */
export async function updateSettings(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requirePermission("settings:write");
  const parsed = parseForm(SettingsSchema, formData);
  if (!parsed.ok) return parsed.state;

  for (const [key, value] of Object.entries(parsed.data)) {
    await setSetting(key as keyof typeof parsed.data, value as never, staff.id);
  }

  await logActivity({
    actorId: staff.id,
    action: "settings.updated",
    meta: parsed.data,
  });

  // `layout` scope: the announcement banner lives in both dashboard shells.
  revalidatePath("/admin", "layout");
  revalidatePath("/dashboard", "layout");
  revalidatePath("/connexion");
  revalidatePath("/inscription");
  return succeed("Paramètres enregistrés.");
}

const text = (max: number) => z.string().trim().max(max).default("");

const CompanySchema = z.object({
  name: z.string().trim().min(1, "Raison sociale requise.").max(160),
  legalForm: text(60),
  capital: text(60),
  address: text(300),
  city: text(120),
  country: text(80),
  phone: text(60),
  email: z.union([z.literal(""), z.string().trim().email("Adresse invalide.")]).default(""),
  website: text(200),
  rc: text(60),
  nif: text(60),
  nis: text(60),
  ai: text(60),
  bank: text(120),
  rib: text(80),
  logoAttachmentId: z.string().optional().transform((v) => (v ? Number(v) : null)),
  signatureAttachmentId: z.string().optional().transform((v) => (v ? Number(v) : null)),
  signatoryName: text(120),
  signatoryTitle: text(120),
  vatRate: z.coerce.number().min(0, "Entre 0 et 100.").max(100, "Entre 0 et 100.").default(0),
  quoteTerms: text(3000),
  invoiceTerms: text(3000),
  footerNote: text(1000),
});

/**
 * The company identity printed on every devis and facture.
 *
 * The logo and signature are checked to be attachments that exist and are PNG
 * or JPEG — the PDF engine cannot embed anything else, and a WebP logo would
 * fail at render time on a customer's download rather than here.
 */
export async function updateCompany(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("settings:write");
  const parsed = parseForm(CompanySchema, formData);
  if (!parsed.ok) return parsed.state;

  for (const field of ["logoAttachmentId", "signatureAttachmentId"] as const) {
    const id = parsed.data[field];
    if (id === null) continue;
    if (!Number.isInteger(id)) return fail("Image invalide.");
    const [file] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
    if (!file || !["image/png", "image/jpeg"].includes(file.contentType)) {
      return fail("Le logo et la signature doivent être des images PNG ou JPEG.");
    }
  }

  await setSetting("company", { ...DEFAULT_COMPANY, ...parsed.data }, staff.id);
  await logActivity({ actorId: staff.id, action: "settings.company_updated", meta: { name: parsed.data.name } });
  revalidatePath("/admin/parametres");
  return succeed("Identité de l'entreprise enregistrée. Elle s'applique aux prochains PDF.");
}
