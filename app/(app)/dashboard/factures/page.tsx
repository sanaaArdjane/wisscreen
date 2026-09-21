import type { Metadata } from "next";
import { requireUser } from "@/lib/guard";
import { listInvoices } from "@/lib/server/queries";
import { PageHeader, Panel, StatTile } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { INVOICE_LABELS, INVOICE_TONE, effectiveInvoiceStatus } from "@/lib/billing";
import { formatMoney, withVat } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { MoneyLines } from "@/components/dashboard/MoneyLines";
import { getCompany } from "@/lib/settings";
import { effectiveCompany } from "@/lib/company";
import { pillSmall } from "@/components/dashboard/pills";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Factures" };

export default async function FacturesPage() {
  const user = await requireUser("/dashboard/factures");
  const [rows, company] = await Promise.all([listInvoices(user.id), getCompany()]);
  // What is actually owed is TTC — the figure on the PDF — not the stored HT.
  // Per document: a facture can carry its own VAT rate.
  const vatOf = (inv: { overrides: unknown }) => effectiveCompany(company, inv.overrides as never).vatRate;
  const ttc = (inv: { amountCents: number; overrides: unknown }) => withVat(inv.amountCents, vatOf(inv));

  const outstanding = rows
    .filter(({ invoice }) => ["envoyee", "en_retard"].includes(effectiveInvoiceStatus(invoice)))
    .reduce((sum, { invoice }) => sum + ttc(invoice), 0);
  const paid = rows
    .filter(({ invoice }) => invoice.status === "payee")
    .reduce((sum, { invoice }) => sum + ttc(invoice), 0);

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
                    <>
                      <a href={`/api/documents/facture/${invoice.id}`} target="_blank" rel="noopener noreferrer" className={pillSmall}>
                        <Icon name="file-text" className="size-4" />
                        PDF
                      </a>
                      <StatusChip label={INVOICE_LABELS[status]} tone={INVOICE_TONE[status]} />
                    </>
                  }
                >
                  <MoneyLines
                    lines={invoice.lines}
                    total={invoice.amountCents}
                    currency={invoice.currency}
                    vatRate={vatOf(invoice)}
                  />
                  {(() => {
                    const c = effectiveCompany(company, invoice.overrides as never);
                    return (c.bank || c.rib) && ["envoyee", "en_retard"].includes(status) ? (
                    <p className="mt-5 border-t border-fg/10 pt-4 text-sm text-fg/80">
                      Règlement par virement : {[c.bank, c.rib && `RIB ${c.rib}`].filter(Boolean).join(" · ")}
                    </p>
                    ) : null;
                  })()}
                </Panel>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
