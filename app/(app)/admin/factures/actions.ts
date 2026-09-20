"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { logActivity, notify } from "@/lib/account";
import { INVOICE_STATUSES, INVOICE_LABELS, type InvoiceStatus } from "@/lib/billing";
import { fail, parseForm, succeed, type ActionState } from "@/lib/actions";
import { formatMoney } from "@/lib/money";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";

const StatusSchema = z.object({
  invoiceId: z.coerce.number().int().positive(),
  status: z.enum(INVOICE_STATUSES),
  dueAt: z
    .string()
    .transform((v) => (v === "" ? undefined : new Date(v)))
    .optional(),
});

/**
 * Moves an invoice through its states. There is no payment provider — a human
 * marks it paid — so this action *is* the billing workflow, and every step it
 * takes is written to the activity log.
 */
export async function setInvoiceStatus(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const staff = await requirePermission("invoices:write");
  const parsed = parseForm(StatusSchema, formData);
  if (!parsed.ok) return parsed.state;

  const [invoice] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.id, parsed.data.invoiceId))
    .limit(1);
  if (!invoice) return fail("Facture introuvable.");

  const status = parsed.data.status as InvoiceStatus;
  const now = new Date();

  await db
    .update(invoices)
    .set({
      status,
      dueAt: parsed.data.dueAt ?? invoice.dueAt,
      // Stamped on the transition, not recomputed: these are the dates that go
      // on the document, and they must not move when an unrelated field is
      // edited later.
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

  // Only the transitions the client cares about reach them. Marking a draft
  // "annulée" is bookkeeping; telling them about it is noise.
  if (status === "envoyee" || status === "payee") {
    const [client] = await db
      .select({ email: userTable.email, name: userTable.name })
      .from(userTable)
      .where(eq(userTable.id, invoice.userId))
      .limit(1);

    await notify({
      userId: invoice.userId,
      type: "invoice",
      title:
        status === "payee"
          ? `Facture ${invoice.ref} réglée — merci`
          : `Nouvelle facture ${invoice.ref}`,
      body: `${invoice.title} — ${formatMoney(invoice.amountCents, invoice.currency)}`,
      href: "/dashboard/factures",
    });

    if (client && status === "envoyee") {
      await sendEmail({
        to: client.email,
        subject: `Votre facture ${invoice.ref}`,
        text: `Bonjour ${client.name},\n\nVotre facture « ${invoice.title} » d'un montant de ${formatMoney(invoice.amountCents, invoice.currency)} est disponible dans votre espace.`,
        action: { label: "Voir la facture", url: `${SITE_URL}/dashboard/factures` },
      });
    }
  }

  revalidatePath("/admin/factures");
  revalidatePath("/dashboard/factures");
  return succeed(`Facture ${INVOICE_LABELS[status].toLowerCase()}.`);
}
