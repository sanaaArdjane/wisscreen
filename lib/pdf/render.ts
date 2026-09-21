import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { createElement } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { attachments, invoices, quotes, user } from "@/lib/db/schema";
import { getCompany } from "@/lib/settings";
import { getObjectBytes, storageConfigured } from "@/lib/storage";
import { BillingDocument, type Assets, type BillingDoc } from "./BillingDocument";

/**
 * Build the PDF for one quote or invoice, from the database, as bytes.
 *
 * Used by the download route and by `sendQuote` / `sendInvoice`, so what the
 * customer downloads and what they were e-mailed are the same render. A logo or
 * signature that cannot be fetched is dropped rather than failing the document:
 * a devis without its logo is still a devis.
 */

async function loadImage(attachmentId: number | null): Promise<Assets["logo"]> {
  if (!attachmentId || !storageConfigured()) return undefined;
  try {
    const [file] = await db.select().from(attachments).where(eq(attachments.id, attachmentId)).limit(1);
    if (!file) return undefined;
    const format = file.contentType === "image/png" ? "png" : file.contentType === "image/jpeg" ? "jpg" : null;
    if (!format) return undefined;
    return { data: await getObjectBytes(file.key), format };
  } catch (error) {
    console.warn("[pdf] could not load image", attachmentId, error);
    return undefined;
  }
}

export type RenderedDocument = { filename: string; bytes: Buffer; ownerId: string; status: string };

export async function renderBillingPdf(kind: "quote" | "invoice", id: number): Promise<RenderedDocument | null> {
  const company = await getCompany();

  let doc: BillingDoc;
  let ownerId: string;
  if (kind === "quote") {
    const [row] = await db
      .select({ q: quotes, client: user })
      .from(quotes)
      .innerJoin(user, eq(user.id, quotes.userId))
      .where(eq(quotes.id, id))
      .limit(1);
    if (!row) return null;
    ownerId = row.q.userId;
    doc = {
      kind,
      ref: row.q.ref,
      title: row.q.title,
      status: row.q.status,
      lines: row.q.lines,
      amountCents: row.q.amountCents,
      currency: row.q.currency,
      note: row.q.note,
      issuedAt: row.q.sentAt ?? row.q.createdAt,
      dueAt: row.q.validUntil,
      client: row.client,
    };
  } else {
    const [row] = await db
      .select({ i: invoices, client: user, quoteRef: quotes.ref })
      .from(invoices)
      .innerJoin(user, eq(user.id, invoices.userId))
      .leftJoin(quotes, eq(quotes.id, invoices.quoteId))
      .where(eq(invoices.id, id))
      .limit(1);
    if (!row) return null;
    ownerId = row.i.userId;
    doc = {
      kind,
      ref: row.i.ref,
      title: row.i.title,
      status: row.i.status,
      lines: row.i.lines,
      amountCents: row.i.amountCents,
      currency: row.i.currency,
      note: row.i.note,
      issuedAt: row.i.issuedAt ?? row.i.createdAt,
      dueAt: row.i.dueAt,
      client: row.client,
      sourceRef: row.quoteRef,
    };
  }

  const [logo, signature] = await Promise.all([
    loadImage(company.logoAttachmentId),
    loadImage(company.signatureAttachmentId),
  ]);

  // `BillingDocument` returns a <Document>, which is what `renderToBuffer`
  // wants; its typing only accepts a <Document> element directly, so say so.
  const element = createElement(BillingDocument, { doc, company, assets: { logo, signature } }) as unknown as ReactElement<DocumentProps>;
  const bytes = await renderToBuffer(element);
  return { filename: `${doc.ref}.pdf`, bytes, ownerId, status: doc.status };
}
