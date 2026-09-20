"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, like } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, quotes, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { logActivity, notify } from "@/lib/account";
import { nextRef, refPeriod, type RefPrefix } from "@/lib/ref";
import { formatMoney, totalCents } from "@/lib/money";
import { fail, optionalText, parseForm, succeed, type ActionState } from "@/lib/actions";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import type { MoneyLine } from "@/lib/db/schema";

/**
 * Quotes, and turning an accepted one into an invoice.
 *
 * Line items arrive as three parallel arrays (`label[]`, `quantity[]`,
 * `unitCents[]`) because that is what a repeated fieldset posts. They're zipped
 * and re-summed here: `amountCents` is always derived from the lines on the
 * server, never trusted from a hidden input, so a tampered form cannot change
 * the total without changing the lines the client will see.
 */

const LineArrays = z.object({
  label: z.union([z.string(), z.array(z.string())]).optional(),
  quantity: z.union([z.string(), z.array(z.string())]).optional(),
  unitCents: z.union([z.string(), z.array(z.string())]).optional(),
});

function readLines(formData: FormData): MoneyLine[] {
  const parsed = LineArrays.parse({
    label: formData.getAll("label").map(String),
    quantity: formData.getAll("quantity").map(String),
    unitCents: formData.getAll("unitCents").map(String),
  });
  const labels = Array.isArray(parsed.label) ? parsed.label : [parsed.label ?? ""];
  const quantities = Array.isArray(parsed.quantity) ? parsed.quantity : [parsed.quantity ?? ""];
  const units = Array.isArray(parsed.unitCents) ? parsed.unitCents : [parsed.unitCents ?? ""];

  return labels
    .map((label, i) => ({
      label: label.trim(),
      quantity: Number(quantities[i] ?? 1) || 0,
      // The form collects whole currency units; cents are this app's storage unit.
      unitCents: Math.round((Number(units[i] ?? 0) || 0) * 100),
    }))
    .filter((l) => l.label !== "");
}

async function allocateRef(prefix: RefPrefix, table: typeof quotes | typeof invoices) {
  const existing = await db
    .select({ ref: table.ref })
    .from(table)
    .where(like(table.ref, `${prefix}-${refPeriod()}-%`));
  return nextRef(
    prefix,
    existing.map((r) => r.ref),
  );
}

const QuoteSchema = z.object({
  quoteId: z.coerce.number().int().positive().optional(),
  userId: z.string().min(1, "Choisissez un client."),
  requestId: z
    .string()
    .transform((v) => (v === "" ? undefined : Number(v)))
    .optional(),
  title: z.string().trim().min(3, "Donnez un intitulé.").max(160),
  note: optionalText,
  validUntil: z
    .string()
    .transform((v) => (v === "" ? undefined : new Date(v)))
    .optional(),
  currency: z.string().trim().min(3).max(3).default("DZD"),
});

export async function saveQuote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("quotes:write");
  const parsed = parseForm(QuoteSchema, formData);
  if (!parsed.ok) return parsed.state;

  const lines = readLines(formData);
  if (lines.length === 0) return fail("Ajoutez au moins une ligne au devis.");

  const amountCents = totalCents(lines);
  const base = {
    userId: parsed.data.userId,
    requestId: parsed.data.requestId ?? null,
    title: parsed.data.title,
    note: parsed.data.note ?? null,
    validUntil: parsed.data.validUntil ?? null,
    currency: parsed.data.currency,
    lines,
    amountCents,
    updatedAt: new Date(),
  };

  if (parsed.data.quoteId) {
    const [existing] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, parsed.data.quoteId))
      .limit(1);
    if (!existing) return fail("Devis introuvable.");
    // A quote the client has already answered is a document of record. Editing
    // it after the fact would rewrite what they agreed to.
    if (existing.status !== "brouillon" && existing.status !== "envoye") {
      return fail("Ce devis a déjà reçu une réponse et ne peut plus être modifié.");
    }

    await db.update(quotes).set(base).where(eq(quotes.id, parsed.data.quoteId));
    await logActivity({
      actorId: staff.id,
      action: "quote.updated",
      entity: "quote",
      entityId: parsed.data.quoteId,
      meta: { amountCents },
    });
    revalidatePath(`/admin/devis/${parsed.data.quoteId}`);
    revalidatePath("/admin/devis");
    return succeed("Devis enregistré.");
  }

  const ref = await allocateRef("DV", quotes);
  const [created] = await db
    .insert(quotes)
    .values({ ...base, ref, createdById: staff.id, status: "brouillon" })
    .returning();

  await logActivity({
    actorId: staff.id,
    action: "quote.created",
    entity: "quote",
    entityId: created.id,
    meta: { ref, amountCents },
  });

  redirect(`/admin/devis/${created.id}`);
}

/** Draft → sent. This is the moment the client can see it, so it notifies. */
export async function sendQuote(formData: FormData): Promise<void> {
  const staff = await requirePermission("quotes:write");
  const id = Number(formData.get("quoteId"));
  if (!Number.isInteger(id)) return;

  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!quote || quote.status !== "brouillon") return;

  await db
    .update(quotes)
    .set({ status: "envoye", updatedAt: new Date() })
    .where(eq(quotes.id, id));

  const [client] = await db
    .select({ email: userTable.email, name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, quote.userId))
    .limit(1);

  await notify({
    userId: quote.userId,
    type: "quote",
    title: `Nouveau devis ${quote.ref}`,
    body: `${quote.title} — ${formatMoney(quote.amountCents, quote.currency)}`,
    href: `/dashboard/devis/${quote.id}`,
  });

  if (client) {
    await sendEmail({
      to: client.email,
      subject: `Votre devis ${quote.ref}`,
      text: `Bonjour ${client.name},\n\nVotre devis « ${quote.title} » est disponible dans votre espace : ${formatMoney(quote.amountCents, quote.currency)}.`,
      action: { label: "Consulter le devis", url: `${SITE_URL}/dashboard/devis/${quote.id}` },
    });
  }

  await logActivity({
    actorId: staff.id,
    action: "quote.sent",
    entity: "quote",
    entityId: id,
    meta: { ref: quote.ref },
  });

  revalidatePath(`/admin/devis/${id}`);
  revalidatePath("/admin/devis");
  revalidatePath("/dashboard/devis");
}

/**
 * Turns an accepted quote into an invoice, copying its lines.
 *
 * Copied, not referenced: an invoice has to keep saying what it said even if
 * the quote is later corrected, and the `quoteId` link is only for navigation.
 */
export async function invoiceFromQuote(formData: FormData): Promise<void> {
  const staff = await requirePermission("invoices:write");
  const id = Number(formData.get("quoteId"));
  if (!Number.isInteger(id)) return;

  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!quote || quote.status !== "accepte") return;

  const [existing] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.quoteId, id))
    .limit(1);
  if (existing) {
    redirect(`/admin/factures?q=${quote.ref}`);
  }

  const ref = await allocateRef("FA", invoices);
  const [created] = await db
    .insert(invoices)
    .values({
      ref,
      userId: quote.userId,
      quoteId: quote.id,
      title: quote.title,
      lines: quote.lines,
      amountCents: quote.amountCents,
      currency: quote.currency,
      status: "brouillon",
      createdById: staff.id,
    })
    .returning();

  await logActivity({
    actorId: staff.id,
    action: "invoice.created_from_quote",
    entity: "invoice",
    entityId: created.id,
    meta: { ref, quoteRef: quote.ref },
  });

  revalidatePath("/admin/factures");
  redirect(`/admin/factures?q=${ref}`);
}

export async function deleteQuote(formData: FormData): Promise<void> {
  const staff = await requirePermission("quotes:delete");
  const id = Number(formData.get("quoteId"));
  if (!Number.isInteger(id)) return;

  // Drafts only: a sent quote is something the client has seen, and deleting it
  // would make their dashboard disagree with their inbox.
  const deleted = await db
    .delete(quotes)
    .where(eq(quotes.id, id))
    .returning({ ref: quotes.ref, status: quotes.status });
  if (deleted.length === 0) return;

  await logActivity({
    actorId: staff.id,
    action: "quote.deleted",
    entity: "quote",
    entityId: id,
    meta: { ref: deleted[0].ref },
  });

  revalidatePath("/admin/devis");
  redirect("/admin/devis");
}
