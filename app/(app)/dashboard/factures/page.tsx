import type { Metadata } from "next";
import { requireUser } from "@/lib/guard";
import { listInvoices } from "@/lib/server/queries";
import { PageHeader, Panel, StatTile } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { INVOICE_LABELS, INVOICE_TONE, effectiveInvoiceStatus } from "@/lib/billing";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { MoneyLines } from "@/components/dashboard/MoneyLines";

export const metadata: Metadata = { title: "Factures" };

export default async function FacturesPage() {
  const user = await requireUser("/dashboard/factures");
  const rows = await listInvoices(user.id);

  const outstanding = rows
    .filter(({ invoice }) => ["envoyee", "en_retard"].includes(effectiveInvoiceStatus(invoice)))
    .reduce((sum, { invoice }) => sum + invoice.amountCents, 0);
  const paid = rows
    .filter(({ invoice }) => invoice.status === "payee")
    .reduce((sum, { invoice }) => sum + invoice.amountCents, 0);

  return (
    <>
      <PageHeader
        title="Factures"
        description="Le détail de chaque facture et son état de règlement."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Aucune facture"
          description="Vos factures apparaîtront ici dès qu'une prestation aura été engagée."
        />
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <StatTile
              label="Reste à régler"
              value={formatMoney(outstanding)}
              hint={outstanding > 0 ? "Merci de procéder au règlement" : "Vous êtes à jour"}
              icon="receipt"
              tone={outstanding > 0 ? "accent" : "cool"}
            />
            <StatTile label="Déjà réglé" value={formatMoney(paid)} icon="check" />
          </div>

          <div className="flex flex-col gap-4">
            {rows.map(({ invoice }) => {
              const status = effectiveInvoiceStatus(invoice);
              return (
                <Panel
                  key={invoice.id}
                  title={invoice.title}
                  description={`${invoice.ref}${invoice.issuedAt ? ` · émise le ${formatDate(invoice.issuedAt)}` : ""}${invoice.dueAt ? ` · échéance ${formatDate(invoice.dueAt)}` : ""}`}
                  actions={
                    <StatusChip label={INVOICE_LABELS[status]} tone={INVOICE_TONE[status]} />
                  }
                >
                  <MoneyLines
                    lines={invoice.lines}
                    total={invoice.amountCents}
                    currency={invoice.currency}
                  />
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
