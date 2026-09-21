import { inArray, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments, invoices, quotes, type MoneyLine } from "@/lib/db/schema";
import { parseOverrides, type CompanyOverrides } from "@/lib/company";
import { nextRef, refPeriod, type RefPrefix } from "@/lib/ref";
import { parseMoneyToCents } from "@/lib/money";

/**
 * Shared by the devis and facture editors: zip the posted line arrays, and
 * allocate the next reference. A plain module because a `"use server"` file
 * may only export async actions.
 *
 * Line items arrive as three parallel arrays (`label[]`, `quantity[]`,
 * `unitCents[]`) — safe here, unlike demo blocks, because every line posts the
 * same three fields. `amountCents` is always re-summed from these on the
 * server, never trusted from the form.
 */
export function readLines(formData: FormData): MoneyLine[] {
  const labels = formData.getAll("label").map(String);
  const quantities = formData.getAll("quantity").map(String);
  const units = formData.getAll("unitCents").map(String);

  return labels
    .map((label, i) => ({
      label: label.trim(),
      quantity: Number((quantities[i] ?? "1").replace(",", ".").replace(/\s/g, "")) || 0,
      // `parseMoneyToCents`, not `Number()`: a French keyboard types "1 250,50",
      // which `Number` reads as NaN — and `|| 0` then saved it as free.
      unitCents: parseMoneyToCents(units[i] ?? "") ?? 0,
    }))
    .filter((l) => l.label !== "");
}

export async function allocateRef(prefix: RefPrefix, table: typeof quotes | typeof invoices) {
  const existing = await db
    .select({ ref: table.ref })
    .from(table)
    .where(like(table.ref, `${prefix}-${refPeriod()}-%`));
  return nextRef(
    prefix,
    existing.map((r) => r.ref),
  );
}

/**
 * Read a document editor's `overrides` input and check any image it points at
 * is an attachment that exists and is PNG/JPEG — the PDF engine embeds nothing
 * else, and a bad logo should fail on save, not on the customer's download.
 */
export async function readOverrides(
  formData: FormData,
): Promise<{ ok: true; overrides: CompanyOverrides } | { ok: false; error: string }> {
  const parsed = parseOverrides(formData.get("overrides"));
  if (!parsed.ok) return parsed;
  const ids = [parsed.overrides.logoAttachmentId, parsed.overrides.signatureAttachmentId].filter(
    (v): v is number => typeof v === "number",
  );
  if (ids.length) {
    const rows = await db
      .select({ id: attachments.id, contentType: attachments.contentType })
      .from(attachments)
      .where(inArray(attachments.id, ids));
    if (rows.length !== new Set(ids).size || rows.some((r) => !["image/png", "image/jpeg"].includes(r.contentType))) {
      return { ok: false, error: "Le logo et la signature doivent être des images PNG ou JPEG." };
    }
  }
  return parsed;
}
