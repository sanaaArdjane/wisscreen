import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, quotes, requests, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { StatusChip } from "@/components/dashboard/ui";
import { MoneyLines } from "@/components/dashboard/MoneyLines";
import { QuoteEditor } from "../QuoteEditor";
import { QuoteActions } from "./QuoteActions";
import { QUOTE_LABELS, QUOTE_TONE, isQuoteStatus } from "@/lib/billing";
import { formatDate, formatDateTime, toDateInput } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Devis" };

export default async function AdminQuotePage({ params }: PageProps<"/admin/devis/[id]">) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const staff = await requirePermission("quotes:read");

  const [row] = await db
    .select({ quote: quotes, client: userTable })
    .from(quotes)
    .innerJoin(userTable, eq(userTable.id, quotes.userId))
    .where(eq(quotes.id, numericId))
    .limit(1);
  if (!row) notFound();

  const { quote, client } = row;
  const status = isQuoteStatus(quote.status) ? quote.status : "brouillon";
  const editable = status === "brouillon" || status === "envoye";
  const mayWrite = can(staff, "quotes:write");

  const [linkedRequest, linkedInvoice, clients] = await Promise.all([
    quote.requestId
      ? db.select().from(requests).where(eq(requests.id, quote.requestId)).limit(1)
      : Promise.resolve([]),
    db.select().from(invoices).where(eq(invoices.quoteId, quote.id)).limit(1),
    mayWrite && editable
      ? db
          .select({ id: userTable.id, name: userTable.name, email: userTable.email })
          .from(userTable)
          .where(ne(userTable.role, "staff"))
          .orderBy(asc(userTable.name))
      : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title={quote.title}
        description={`${quote.ref} · ${client.name} · créé le ${formatDateTime(quote.createdAt)}`}
        backHref="/admin/devis"
        backLabel="Devis"
        actions={<StatusChip label={QUOTE_LABELS[status]} tone={QUOTE_TONE[status]} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          {mayWrite && editable ? (
            <Panel
              title="Contenu"
              description={
                status === "envoye"
                  ? "Le client a déjà reçu ce devis — toute modification lui sera visible immédiatement."
                  : undefined
              }
            >
              <QuoteEditor
                quoteId={quote.id}
                clients={clients.map((c) => ({ value: c.id, label: `${c.name} — ${c.email}` }))}
                defaultUserId={quote.userId}
                requestId={quote.requestId ?? undefined}
                requestLabel={
                  linkedRequest[0] ? `${linkedRequest[0].ref} — ${linkedRequest[0].title}` : undefined
                }
                title={quote.title}
                note={quote.note}
                validUntil={toDateInput(quote.validUntil)}
                currency={quote.currency}
                lines={quote.lines}
              />
            </Panel>
          ) : (
            <Panel title="Détail">
              <MoneyLines
                lines={quote.lines}
                total={quote.amountCents}
                currency={quote.currency}
              />
              {quote.note && (
                <p className="mt-6 whitespace-pre-wrap border-t border-ink/10 pt-4 text-sm text-ink/80">
                  {quote.note}
                </p>
              )}
            </Panel>
          )}
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Client">
            <p className="text-sm font-medium text-ink">{client.name}</p>
            <p className="text-sm text-ink/80">{client.email}</p>
            {can(staff, "users:read") && (
              <Link
                href={`/admin/utilisateurs/${client.id}`}
                className="mt-2 inline-block text-sm text-signal-deep underline underline-offset-4"
              >
                Fiche client
              </Link>
            )}
          </Panel>

          <Panel title="Suivi">
            <dl className="flex flex-col gap-3 text-sm">
              <Row label="Montant" value={formatMoney(quote.amountCents, quote.currency)} />
              <Row
                label="Validité"
                value={quote.validUntil ? formatDate(quote.validUntil) : "Sans limite"}
              />
              <Row label="Dernière modification" value={formatDateTime(quote.updatedAt)} />
            </dl>
          </Panel>

          {mayWrite && (
            <Panel title="Actions">
              <QuoteActions
                quoteId={quote.id}
                status={status}
                hasInvoice={linkedInvoice.length > 0}
                canInvoice={can(staff, "invoices:write")}
                canDelete={can(staff, "quotes:delete")}
              />
            </Panel>
          )}

          {linkedInvoice[0] && (
            <Panel title="Facture liée">
              <Link
                href={`/admin/factures?q=${linkedInvoice[0].ref}`}
                className="text-sm text-signal-deep underline underline-offset-4"
              >
                {linkedInvoice[0].ref}
              </Link>
            </Panel>
          )}

          {linkedRequest[0] && (
            <Panel title="Demande liée">
              <Link
                href={`/admin/demandes/${linkedRequest[0].id}`}
                className="text-sm text-signal-deep underline underline-offset-4"
              >
                {linkedRequest[0].ref} — {linkedRequest[0].title}
              </Link>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ink/80">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
