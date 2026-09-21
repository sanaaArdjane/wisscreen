"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, quotes } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { logActivity, notify } from "@/lib/account";
import { allocateRef, readLines } from "@/lib/billing-lines";
import { emailBillingDocument } from "@/lib/billing-send";
import { formatMoney, totalCents } from "@/lib/money";
import { fail, optionalText, parseForm, succeed, type ActionState } from "@/lib/actions";

/**
 * Quotes, and turning an accepted one into an invoice.
 *
 * Line parsing and references are shared with invoices in `lib/billing-lines.ts`;
 * the PDF and e-mail step in `lib/billing-send.ts`.
 */

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

/**
 * Send a quote by e-mail, with its PDF attached.
 *
 * From a draft this is the moment the client can see it, so it also moves it
 * to `envoye` and notifies. From any later state it is a **resend** — the same
 * PDF, current data, no status change. Before, a quote could be sent exactly
 * once: `sendQuote` returned early unless it was a draft.
 */
export async function sendQuote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("quotes:write");
  const id = Number(formData.get("quoteId"));
  const message = String(formData.get("message") ?? "");
  if (!Number.isInteger(id)) return fail("Devis introuvable.");

  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!quote) return fail("Devis introuvable.");
  if (quote.lines.length === 0) return fail("Ajoutez au moins une ligne avant d'envoyer.");

  const first = quote.status === "brouillon";
  if (first) {
    await db.update(quotes).set({ status: "envoye", updatedAt: new Date() }).where(eq(quotes.id, id));
  }

  const sent = await emailBillingDocument("quote", id, staff, message);

  if (first) {
    await notify({
      userId: quote.userId,
      type: "quote",
      title: `Nouveau devis ${quote.ref}`,
      body: `${quote.title} — ${formatMoney(quote.amountCents, quote.currency)}`,
      href: `/dashboard/devis/${quote.id}`,
      actorId: staff.id,
      entity: "quote",
      entityId: quote.id,
    });
  }

  await logActivity({
    actorId: staff.id,
    action: first ? "quote.sent" : "quote.resent",
    entity: "quote",
    entityId: id,
    meta: { ref: quote.ref, emailed: sent.ok && !sent.skipped },
  });

  revalidatePath(`/admin/devis/${id}`);
  revalidatePath("/admin/devis");
  revalidatePath("/dashboard/devis");
  revalidatePath(`/dashboard/devis/${id}`);

  if (!sent.ok) return fail(`Devis ${first ? "envoyé dans l'espace client" : "non renvoyé"}, mais l'e-mail a échoué : ${sent.error}`);
  return succeed(
    sent.skipped
      ? `${first ? "Envoyé" : "Renvoyé"} dans l'espace client. E-mail non configuré : le message et le PDF ont été journalisés, pas expédiés.`
      : `Devis ${quote.ref} ${first ? "envoyé" : "renvoyé"} par e-mail, PDF joint.`,
  );
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
    redirect(`/admin/factures/${existing.id}`);
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
  redirect(`/admin/factures/${created.id}`);
}

/**
 * Delete a quote.
 *
 * A draft goes with a plain confirmation. Anything the client has already seen
 * requires the reference to be typed: deleting it makes their dashboard
 * disagree with the e-mail in their inbox, and that should be a decision, not
 * a click. (The old action deleted any status while its comment said "drafts
 * only" — the UI was the only thing enforcing it.) An invoice made from it
 * survives, with its `quote_id` set to null.
 */
export async function deleteQuote(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("quotes:delete");
  const id = Number(formData.get("quoteId"));
  if (!Number.isInteger(id)) return fail("Devis introuvable.");

  const [quote] = await db.select().from(quotes).where(eq(quotes.id, id)).limit(1);
  if (!quote) return fail("Devis introuvable.");
  if (quote.status !== "brouillon" && String(formData.get("confirm") ?? "").trim() !== quote.ref) {
    return fail(`Ce devis a été envoyé au client. Saisissez « ${quote.ref} » pour confirmer.`);
  }

  await db.delete(quotes).where(eq(quotes.id, id));
  await logActivity({
    actorId: staff.id,
    action: "quote.deleted",
    entity: "quote",
    entityId: id,
    meta: { ref: quote.ref, status: quote.status, amountCents: quote.amountCents },
  });

  revalidatePath("/admin/devis");
  revalidatePath("/dashboard/devis");
  redirect("/admin/devis");
}
