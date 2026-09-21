"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { logActivity, notify } from "@/lib/account";
import { INVOICE_STATUSES, INVOICE_LABELS, type InvoiceStatus } from "@/lib/billing";
import { fail, optionalText, parseForm, succeed, type ActionState } from "@/lib/actions";
import { formatMoney, totalCents } from "@/lib/money";
import { allocateRef, readLines, readOverrides } from "@/lib/billing-lines";
import { emailBillingDocument } from "@/lib/billing-send";

/**
 * Invoices. They used to be reachable only from an accepted quote, with no way
 * to edit what they said and no way to delete one. They now have the same
 * editor, PDF and e-mail as quotes; `invoiceFromQuote` is still the usual
 * origin. There is no payment provider — a human marks one paid, so
 * `setInvoiceStatus` *is* the billing workflow and every step is logged.
 */

function refresh(id?: number) {
  revalidatePath("/admin/factures");
  if (id) revalidatePath(`/admin/factures/${id}`);
  revalidatePath("/dashboard/factures");
  revalidatePath("/dashboard");
}

/** A paid or cancelled invoice is a closed accounting record. */
const EDITABLE: InvoiceStatus[] = ["brouillon", "envoyee", "en_retard"];

const InvoiceSchema = z.object({
  invoiceId: z.coerce.number().int().positive().optional(),
  userId: z.string().min(1, "Choisissez un client."),
  title: z.string().trim().min(3, "Donnez un intitulé.").max(160),
  note: optionalText,
  dueAt: z
    .string()
    .transform((v) => (v === "" ? null : new Date(v)))
    .optional(),
  currency: z.string().trim().min(3).max(3).default("DZD"),
});

export async function saveInvoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("invoices:write");
  const parsed = parseForm(InvoiceSchema, formData);
  if (!parsed.ok) return parsed.state;
  const lines = readLines(formData);
  if (lines.length === 0) return fail("Ajoutez au moins une ligne.");
  const ov = await readOverrides(formData);
  if (!ov.ok) return fail(ov.error);
  const amountCents = totalCents(lines);

  if (parsed.data.invoiceId) {
    const [existing] = await db.select().from(invoices).where(eq(invoices.id, parsed.data.invoiceId)).limit(1);
    if (!existing) return fail("Facture introuvable.");
    if (!EDITABLE.includes(existing.status as InvoiceStatus)) {
      return fail("Une facture payée ou annulée ne se modifie plus. Émettez un avoir ou une nouvelle facture.");
    }
    await db
      .update(invoices)
      .set({
        title: parsed.data.title,
        note: parsed.data.note ?? null,
        dueAt: parsed.data.dueAt ?? null,
        currency: parsed.data.currency,
        lines,
        amountCents,
        overrides: ov.overrides,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, existing.id));
    await logActivity({
      actorId: staff.id,
      action: "invoice.updated",
      entity: "invoice",
      entityId: existing.id,
      meta: { ref: existing.ref, amountCents },
    });
    refresh(existing.id);
    return succeed("Facture enregistrée.");
  }

  const created = await insertWithRef({
    userId: parsed.data.userId,
    title: parsed.data.title,
    note: parsed.data.note ?? null,
    dueAt: parsed.data.dueAt ?? null,
    currency: parsed.data.currency,
    lines,
    amountCents,
    overrides: ov.overrides,
    status: "brouillon",
    createdById: staff.id,
  });
  await logActivity({
    actorId: staff.id,
    action: "invoice.created",
    entity: "invoice",
    entityId: created.id,
    meta: { ref: created.ref, amountCents },
  });
  refresh();
  redirect(`/admin/factures/${created.id}`);
}

/** Allocate `FA-YYMM-NNNN` and insert, retrying on the unique index. */
async function insertWithRef(values: Omit<typeof invoices.$inferInsert, "ref">) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const ref = await allocateRef("FA", invoices);
    try {
      const [row] = await db
        .insert(invoices)
        .values({ ...values, ref })
        .returning();
      return row;
    } catch (err) {
      const dup = typeof err === "object" && err !== null && "code" in err && err.code === "23505";
      if (!dup || attempt === 2) throw err;
    }
  }
  throw new Error("unreachable");
}

/**
 * E-mail the invoice with its PDF. From a draft, this also issues it — status
 * `envoyee`, `issuedAt` stamped — and notifies. Afterwards it is a resend.
 */
export async function sendInvoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("invoices:write");
  const id = Number(formData.get("invoiceId"));
  const message = String(formData.get("message") ?? "");
  if (!Number.isInteger(id)) return fail("Facture introuvable.");

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
  if (!invoice) return fail("Facture introuvable.");
  if (invoice.status === "annulee") return fail("Une facture annulée ne s'envoie pas.");

  const first = invoice.status === "brouillon";
  if (first) {
    await db
      .update(invoices)
      .set({ status: "envoyee", issuedAt: invoice.issuedAt ?? new Date(), updatedAt: new Date() })
      .where(eq(invoices.id, id));
  }

  const sent = await emailBillingDocument("invoice", id, staff, message);

  if (first) {
    await notify({
      userId: invoice.userId,
      type: "invoice",
      title: `Nouvelle facture ${invoice.ref}`,
      body: `${invoice.title} — ${formatMoney(invoice.amountCents, invoice.currency)}`,
      href: "/dashboard/factures",
      actorId: staff.id,
      entity: "invoice",
      entityId: id,
    });
  }
  await logActivity({
    actorId: staff.id,
    action: first ? "invoice.sent" : "invoice.resent",
    entity: "invoice",
    entityId: id,
    meta: { ref: invoice.ref, emailed: sent.ok && !sent.skipped },
  });

  refresh(id);
  if (!sent.ok) return fail(`L'e-mail n'est pas parti : ${sent.error}`);
  return succeed(
    sent.skipped
      ? `Facture ${first ? "émise" : "renvoyée"}. E-mail non configuré : message et PDF journalisés, pas expédiés.`
      : `Facture ${invoice.ref} ${first ? "émise et envoyée" : "renvoyée"} par e-mail, PDF joint.`,
  );
}

const StatusSchema = z.object({
  invoiceId: z.coerce.number().int().positive(),
  status: z.enum(INVOICE_STATUSES),
  dueAt: z
    .string()
    .transform((v) => (v === "" ? undefined : new Date(v)))
    .optional(),
});

/** Move an invoice through its states — mainly "payée", by hand. */
export async function setInvoiceStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("invoices:write");
  const parsed = parseForm(StatusSchema, formData);
  if (!parsed.ok) return parsed.state;

  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, parsed.data.invoiceId)).limit(1);
  if (!invoice) return fail("Facture introuvable.");

  const status = parsed.data.status as InvoiceStatus;
  const now = new Date();
  await db
    .update(invoices)
    .set({
      status,
      dueAt: parsed.data.dueAt ?? invoice.dueAt,
      // Stamped on the transition, not recomputed: these are the dates on the
      // document, and they must not move when an unrelated field is edited.
      issuedAt: status !== "brouillon" && !invoice.issuedAt ? now : invoice.issuedAt,
      paidAt: status === "payee" ? (invoice.paidAt ?? now) : null,
      updatedAt: now,
    })
    .where(eq(invoices.id, invoice.id));

  await logActivity({
    actorId: staff.id,
    action: "invoice.status_changed",
    entity: "invoice",
    entityId: invoice.id,
    meta: { ref: invoice.ref, from: invoice.status, to: status },
  });

  if (status === "payee" && invoice.status !== "payee") {
    await notify({
      userId: invoice.userId,
      type: "invoice",
      title: `Facture ${invoice.ref} réglée — merci`,
      body: `${invoice.title} — ${formatMoney(invoice.amountCents, invoice.currency)}`,
      href: "/dashboard/factures",
      actorId: staff.id,
      entity: "invoice",
      entityId: invoice.id,
    });
  }

  refresh(invoice.id);
  return succeed(`Facture ${INVOICE_LABELS[status].toLowerCase()}.`);
}

/**
 * Delete an invoice. A draft goes with a plain confirmation; one the client has
 * received needs its reference typed — and for a paid one, cancelling
 * ("annulée") is almost always the right move instead, which keeps the record.
 */
export async function deleteInvoice(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const staff = await requirePermission("invoices:delete");
  const id = Number(formData.get("invoiceId"));
  const [invoice] = Number.isInteger(id) ? await db.select().from(invoices).where(eq(invoices.id, id)).limit(1) : [];
  if (!invoice) return fail("Facture introuvable.");
  if (invoice.status !== "brouillon" && String(formData.get("confirm") ?? "").trim() !== invoice.ref) {
    return fail(`Saisissez exactement « ${invoice.ref} » pour confirmer.`);
  }

  await db.delete(invoices).where(eq(invoices.id, id));
  await logActivity({
    actorId: staff.id,
    action: "invoice.deleted",
    entity: "invoice",
    entityId: id,
    meta: { ref: invoice.ref, status: invoice.status, amountCents: invoice.amountCents },
  });
  refresh();
  redirect("/admin/factures");
}
