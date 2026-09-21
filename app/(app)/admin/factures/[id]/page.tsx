import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, quotes, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { StatusChip } from "@/components/dashboard/ui";
import { MoneyLines } from "@/components/dashboard/MoneyLines";
import { QuoteEditor } from "../../devis/QuoteEditor";
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

  const company = await getCompany();
  const mayWrite = can(staff, "invoices:write");
  const editable = ["brouillon", "envoyee", "en_retard"].includes(invoice.status);
  const effective = effectiveInvoiceStatus(invoice);
  const clients = mayWrite && editable
    ? await db
        .select({ id: userTable.id, name: userTable.name, email: userTable.email })
        .from(userTable)
        .where(ne(userTable.role, "staff"))
        .orderBy(asc(userTable.name))
    : [];

  return (
    <>
      <PageHeader
        title={invoice.title}
        description={`${invoice.ref} · ${client.name}`}
        backHref="/admin/factures"
        backLabel="Factures"
        actions={<StatusChip label={INVOICE_LABELS[effective]} tone={INVOICE_TONE[effective]} />}
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title={mayWrite && editable ? "Contenu" : "Détail"}>
          {mayWrite && editable ? (
            <QuoteEditor
              kind="invoice"
              quoteId={invoice.id}
              clients={clients.map((c) => ({ value: c.id, label: `${c.name} — ${c.email}` }))}
              defaultUserId={invoice.userId}
              title={invoice.title}
              note={invoice.note}
              validUntil={toDateInput(invoice.dueAt)}
              currency={invoice.currency}
              lines={invoice.lines}
            />
          ) : (
            <>
              <MoneyLines lines={invoice.lines} total={invoice.amountCents} currency={invoice.currency} vatRate={company.vatRate} />
              {invoice.note && <p className="mt-6 whitespace-pre-wrap border-t border-fg/10 pt-4 text-sm text-fg/80">{invoice.note}</p>}
            </>
          )}
        </Panel>
        <div className="flex flex-col gap-6">
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
