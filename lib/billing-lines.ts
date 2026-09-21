import { like } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, quotes, type MoneyLine } from "@/lib/db/schema";
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
