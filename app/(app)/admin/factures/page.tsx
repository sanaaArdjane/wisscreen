import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel, StatTile } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { pillPrimary } from "@/components/dashboard/pills";
import { Icon } from "@/components/ui/Icon";
import {
  INVOICE_LABELS,
  INVOICE_STATUSES,
  INVOICE_TONE,
  effectiveInvoiceStatus,
  isInvoiceStatus,
} from "@/lib/billing";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Factures" };

export default async function AdminFacturesPage({ searchParams }: PageProps<"/admin/factures">) {
  const staff = await requirePermission("invoices:read");
  const { q, statut } = await searchParams;

  const filters: SQL[] = [];
  const status = typeof statut === "string" ? statut : "tous";
  if (isInvoiceStatus(status)) filters.push(eq(invoices.status, status));

  const search = typeof q === "string" ? q.trim() : "";
  if (search) {
    const like = `%${search}%`;
    filters.push(
      or(ilike(invoices.ref, like), ilike(invoices.title, like), ilike(userTable.name, like))!,
    );
  }

  const rows = await db
    .select({ invoice: invoices, client: userTable })
    .from(invoices)
    .innerJoin(userTable, eq(userTable.id, invoices.userId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(invoices.createdAt))
    .limit(200);

  const outstanding = rows
    .filter(({ invoice }) => ["envoyee", "en_retard"].includes(effectiveInvoiceStatus(invoice)))
    .reduce((sum, { invoice }) => sum + invoice.amountCents, 0);
  const collected = rows
    .filter(({ invoice }) => invoice.status === "payee")
    .reduce((sum, { invoice }) => sum + invoice.amountCents, 0);
  const overdue = rows.filter(
    ({ invoice }) => effectiveInvoiceStatus(invoice) === "en_retard",
  ).length;

  const mayWrite = can(staff, "invoices:write");

  return (
    <>
      <PageHeader
        title="Factures"
        description="Aucun encaissement automatique : le statut est posé à la main, sur chaque facture."
        actions={
          mayWrite && (
            <Link href="/admin/factures/nouveau" className={pillPrimary}>
              <Icon name="plus" className="size-4" />
              Nouvelle facture
            </Link>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile
          label="Encours"
          value={formatMoney(outstanding)}
          hint="Envoyées et non réglées"
          icon="receipt"
          tone={outstanding > 0 ? "accent" : "cool"}
        />
        <StatTile label="Encaissé" value={formatMoney(collected)} icon="check" />
        <StatTile
          label="En retard"
          value={overdue}
          hint={overdue > 0 ? "Échéance dépassée" : "Aucune"}
          icon="clock"
        />
      </div>

      <FilterBar
        basePath="/admin/factures"
        searchPlaceholder="Référence, intitulé, client…"
        filters={[
          {
            name: "statut",
            label: "Statut",
            value: status,
            options: [
              { value: "tous", label: "Tous" },
              ...INVOICE_STATUSES.map((s) => ({ value: s, label: INVOICE_LABELS[s] })),
            ],
          },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Aucune facture"
          description="Une facture naît d'un devis accepté (depuis la fiche du devis), ou se crée directement."
        />
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-fg/10">
            {rows.map(({ invoice, client }) => {
              const effective = effectiveInvoiceStatus(invoice);
              return (
                <li key={invoice.id}>
                  <Link
                    href={`/admin/factures/${invoice.id}`}
                    className="flex flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-soft"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-[650] text-fg">{invoice.title}</span>
                      <span className="block truncate text-xs text-fg/80">
                        {invoice.ref} · {client.name}
                        {invoice.issuedAt ? ` · émise le ${formatDate(invoice.issuedAt)}` : ""}
                        {invoice.dueAt ? ` · échéance ${formatDate(invoice.dueAt)}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-[650] tabular-nums text-fg">
                      {formatMoney(invoice.amountCents, invoice.currency)}
                    </span>
                    <StatusChip label={INVOICE_LABELS[effective]} tone={INVOICE_TONE[effective]} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </>
  );
}
