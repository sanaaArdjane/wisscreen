import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, quotes, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { StatusChip } from "@/components/dashboard/ui";
import { DocumentEditor } from "@/components/dashboard/billing/DocumentEditor";
import { DocumentPreview } from "@/components/dashboard/billing/DocumentPreview";
import { previewDoc } from "@/lib/billing-preview";
import { listBillableClients } from "@/lib/server/queries";
import { storageConfigured } from "@/lib/storage";
import { effectiveCompany, type CompanyOverrides } from "@/lib/company";
import { InvoiceControls } from "../InvoiceControls";
import { InvoiceActions } from "../InvoiceActions";
import { INVOICE_LABELS, INVOICE_TONE, effectiveInvoiceStatus } from "@/lib/billing";
import { formatDate, formatDateTime, toDateInput } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getCompany } from "@/lib/settings";

export const metadata: Metadata = { title: "Facture" };

export default async function AdminInvoicePage({ params }: PageProps<"/admin/factures/[id]">) {
  const staff = await requirePermission("invoices:read");
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();

  const [row] = await db
    .select({ invoice: invoices, client: userTable, quote: { id: quotes.id, ref: quotes.ref } })
    .from(invoices)
    .innerJoin(userTable, eq(userTable.id, invoices.userId))
    .leftJoin(quotes, eq(quotes.id, invoices.quoteId))
    .where(eq(invoices.id, id))
    .limit(1);
  if (!row) notFound();
  const { invoice, client, quote } = row;

  const base = await getCompany();
  const overrides = (invoice.overrides ?? {}) as CompanyOverrides;
  const company = effectiveCompany(base, overrides);
  const mayWrite = can(staff, "invoices:write");
  const editable = ["brouillon", "envoyee", "en_retard"].includes(invoice.status);
  const effective = effectiveInvoiceStatus(invoice);
  const clients = mayWrite && editable ? await listBillableClients() : [];

  return (
    <>
      <PageHeader
        title={invoice.title}
        description={`${invoice.ref} · ${client.name}`}
        backHref="/admin/factures"
        backLabel="Factures"
        actions={<StatusChip label={INVOICE_LABELS[effective]} tone={INVOICE_TONE[effective]} />}
      />
      {mayWrite && editable ? (
        <Panel
          title="Contenu de la facture"
          description="Modifiez à gauche ou directement dans l'aperçu. Les informations de l'émetteur modifiées ici ne valent que pour cette facture."
        >
          <DocumentEditor
            kind="invoice"
            docId={invoice.id}
            docRef={invoice.ref}
            sourceRef={quote?.ref}
            issuedAt={(invoice.issuedAt ?? invoice.createdAt).toISOString()}
            clients={clients}
            defaultUserId={invoice.userId}
            title={invoice.title}
            note={invoice.note}
            date={toDateInput(invoice.dueAt)}
            currency={invoice.currency}
            lines={invoice.lines}
            company={base}
            overrides={overrides}
            storage={storageConfigured()}
          />
        </Panel>
      ) : (
        <Panel title="Document" description="Facture payée ou annulée : elle ne se modifie plus.">
          <div className="mx-auto max-w-3xl rounded-3xl bg-soft p-4 sm:p-6">
            <DocumentPreview
              doc={previewDoc({
                kind: "invoice",
                ref: invoice.ref,
                title: invoice.title,
                note: invoice.note,
                date: invoice.issuedAt ?? invoice.createdAt,
                dueAt: invoice.dueAt,
                currency: invoice.currency,
                lines: invoice.lines,
                client,
                sourceRef: quote?.ref,
              })}
              company={company}
            />
          </div>
        </Panel>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-3 lg:grid-cols-3">
          <Panel title="Document et envoi">
            <InvoiceActions
              invoiceId={invoice.id}
              invoiceRef={invoice.ref}
              status={invoice.status}
              sentAt={invoice.sentAt ? formatDateTime(invoice.sentAt) : null}
              canWrite={mayWrite}
              canDelete={can(staff, "invoices:delete")}
            />
          </Panel>
          {mayWrite && (
            <Panel title="Statut et règlement">
              <InvoiceControls invoiceId={invoice.id} status={invoice.status} dueAt={toDateInput(invoice.dueAt)} />
            </Panel>
          )}
          <Panel title="Suivi">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-fg/80">Montant HT</dt>
              <dd className="text-right font-[650] tabular-nums text-fg">{formatMoney(invoice.amountCents, invoice.currency)}</dd>
              <dt className="text-fg/80">Émise le</dt>
              <dd className="text-right text-fg">{formatDate(invoice.issuedAt)}</dd>
              <dt className="text-fg/80">Échéance</dt>
              <dd className="text-right text-fg">{formatDate(invoice.dueAt)}</dd>
              <dt className="text-fg/80">Payée le</dt>
              <dd className="text-right text-fg">{formatDate(invoice.paidAt)}</dd>
            </dl>
            <p className="mt-4 text-sm">
              Client :{" "}
              <Link href={`/admin/utilisateurs/${client.id}`} className="font-[650] text-fg hover:underline">
                {client.name}
              </Link>
            </p>
            {quote?.id && (
              <p className="mt-1 text-sm">
                Devis :{" "}
                <Link href={`/admin/devis/${quote.id}`} className="font-[650] text-fg hover:underline">
                  {quote.ref}
                </Link>
              </p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
