import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments, invoices, quotes, user as userTable } from "@/lib/db/schema";
import { renderBillingPdf } from "@/lib/pdf/render";
import { putObject, storageConfigured } from "@/lib/storage";
import { sendEmail } from "@/lib/email";
import { getCompany } from "@/lib/settings";
import { formatMoney, withVat } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { SITE_URL } from "@/lib/site";

/**
 * E-mail a devis or facture to its client with the PDF attached.
 *
 * The bytes that go out are also written to the bucket and recorded on the
 * row (`pdfKey`) and as a client-visible attachment — so "what exactly did we
 * send them on the 12th?" has an answer after the lines were edited, and the
 * PDF shows up in the client's /dashboard/documents.
 *
 * Storage unset: the e-mail still goes, the archive copy is skipped. E-mail
 * unset: `sendEmail` logs it (naming the attachment) and reports success.
 */
export async function emailBillingDocument(
  kind: "quote" | "invoice",
  id: number,
  sender: { id: string; name: string; email: string },
  message?: string,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const rendered = await renderBillingPdf(kind, id);
  if (!rendered) return { ok: false, error: "not_found" };

  const table = kind === "quote" ? quotes : invoices;
  const [row] = await db.select().from(table).where(eq(table.id, id)).limit(1);
  const [client] = await db
    .select({ id: userTable.id, email: userTable.email, name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, rendered.ownerId))
    .limit(1);
  if (!row || !client) return { ok: false, error: "not_found" };

  const company = await getCompany();
  const now = new Date();
  let pdfKey: string | null = null;
  if (storageConfigured()) {
    try {
      pdfKey = `u/${sender.id}/documents/${rendered.filename.replace(/\.pdf$/, "")}-${now.getTime()}.pdf`;
      await putObject(pdfKey, rendered.bytes, "application/pdf");
      await db.insert(attachments).values({
        key: pdfKey,
        filename: rendered.filename,
        contentType: "application/pdf",
        sizeBytes: rendered.bytes.length,
        uploadedById: sender.id,
        ownerId: client.id,
      });
    } catch (error) {
      console.warn("[billing] could not archive the sent PDF", error);
      pdfKey = null;
    }
  }

  const isQuote = kind === "quote";
  const label = isQuote ? "devis" : "facture";
  const href = isQuote ? `/dashboard/devis/${id}` : `/dashboard/factures`;
  // The figure in the PDF they are about to open: TTC when VAT is configured.
  const amount = `${formatMoney(withVat(row.amountCents, company.vatRate), row.currency)}${company.vatRate > 0 ? " TTC" : ""}`;
  const due =
    isQuote && "validUntil" in row && row.validUntil
      ? `\nValable jusqu'au ${formatDate(row.validUntil)}.`
      : !isQuote && "dueAt" in row && row.dueAt
        ? `\nÉchéance : ${formatDate(row.dueAt)}.`
        : "";

  const result = await sendEmail({
    to: client.email,
    replyTo: sender.email,
    subject: `${company.name} — ${isQuote ? "Devis" : "Facture"} ${row.ref}`,
    text:
      `Bonjour ${client.name},\n\n` +
      (message?.trim()
        ? `${message.trim()}\n\n`
        : `Veuillez trouver ci-joint ${isQuote ? "notre devis" : "votre facture"} ${row.ref} — « ${row.title} ».\n\n`) +
      `Montant : ${amount}.${due}\n\n` +
      (isQuote
        ? "Vous pouvez l'accepter ou le refuser directement depuis votre espace."
        : "Retrouvez-la à tout moment dans votre espace.") +
      `\n\n${sender.name}\n${company.name}`,
    action: { label: `Ouvrir le ${label}`.replace("le facture", "la facture"), url: `${SITE_URL}${href}` },
    attachments: [{ filename: rendered.filename, content: rendered.bytes }],
  });

  await db
    .update(table)
    .set({ sentAt: now, ...(pdfKey ? { pdfKey } : {}), updatedAt: now })
    .where(eq(table.id, id));

  return result;
}
