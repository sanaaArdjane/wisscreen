import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, quotes, requests, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { StatusChip } from "@/components/dashboard/ui";
import { QuoteActions } from "./QuoteActions";
import { QUOTE_LABELS, QUOTE_TONE, isQuoteStatus } from "@/lib/billing";
import { formatDate, formatDateTime, toDateInput } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getCompany } from "@/lib/settings";
import { effectiveCompany, type CompanyOverrides } from "@/lib/company";
import { listBillableClients } from "@/lib/server/queries";
import { previewDoc } from "@/lib/billing-preview";
import { DocumentEditor } from "@/components/dashboard/billing/DocumentEditor";
import { DocumentPreview } from "@/components/dashboard/billing/DocumentPreview";
import { storageConfigured } from "@/lib/storage";

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
  const base = await getCompany();
  const overrides = (quote.overrides ?? {}) as CompanyOverrides;
  const company = effectiveCompany(base, overrides);
  const status = isQuoteStatus(quote.status) ? quote.status : "brouillon";
  const editable = status === "brouillon" || status === "envoye";
  const mayWrite = can(staff, "quotes:write");

  const [linkedRequest, linkedInvoice, clients] = await Promise.all([
    quote.requestId
      ? db.select().from(requests).where(eq(requests.id, quote.requestId)).limit(1)
      : Promise.resolve([]),
    db.select().from(invoices).where(eq(invoices.quoteId, quote.id)).limit(1),
    mayWrite && editable ? listBillableClients() : Promise.resolve([]),
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

      {mayWrite && editable ? (
        <Panel
          title="Contenu du devis"
          description={
            status === "envoye"
              ? "Le client a déjà reçu ce devis — toute modification lui sera visible immédiatement. Renvoyez-le ensuite."
              : "Modifiez à gauche ou directement dans l'aperçu. Les informations de l'émetteur modifiées ici ne valent que pour ce devis."
          }
        >
          <DocumentEditor
            kind="quote"
            docId={quote.id}
            docRef={quote.ref}
            issuedAt={(quote.sentAt ?? quote.createdAt).toISOString()}
            clients={clients}
            defaultUserId={quote.userId}
            requestId={quote.requestId ?? undefined}
            requestLabel={linkedRequest[0] ? `${linkedRequest[0].ref} — ${linkedRequest[0].title}` : undefined}
            title={quote.title}
            note={quote.note}
            date={toDateInput(quote.validUntil)}
            currency={quote.currency}
            lines={quote.lines}
            company={base}
            overrides={overrides}
            storage={storageConfigured()}
          />
        </Panel>
      ) : (
        <Panel title="Document" description="Ce devis a reçu une réponse : il ne se modifie plus.">
          <div className="mx-auto max-w-3xl rounded-3xl bg-soft p-4 sm:p-6">
            <DocumentPreview
              doc={previewDoc({
                kind: "quote",
                ref: quote.ref,
                title: quote.title,
                note: quote.note,
                date: quote.sentAt ?? quote.createdAt,
                dueAt: quote.validUntil,
                currency: quote.currency,
                lines: quote.lines,
                client,
              })}
              company={company}
            />
          </div>
        </Panel>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="grid gap-6 lg:col-span-3 lg:grid-cols-3">
          <Panel title="Client">
            <p className="text-sm font-[650] text-fg">{client.name}</p>
            <p className="text-sm text-fg/80">{client.email}</p>
            {can(staff, "users:read") && (
              <Link
                href={`/admin/utilisateurs/${client.id}`}
                className="mt-2 inline-block text-sm font-[650] text-fg underline underline-offset-4"
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
              <Row label="Envoyé le" value={quote.sentAt ? formatDateTime(quote.sentAt) : "Pas encore"} />
              <Row label="Dernière modification" value={formatDateTime(quote.updatedAt)} />
            </dl>
          </Panel>

          <Panel title="Document et envoi">
            <QuoteActions
              quoteId={quote.id}
              quoteRef={quote.ref}
              status={status}
              sentAt={quote.sentAt ? formatDateTime(quote.sentAt) : null}
              hasInvoice={linkedInvoice.length > 0}
              canWrite={mayWrite}
              canInvoice={can(staff, "invoices:write")}
              canProvision={can(staff, "subscriptions:write")}
              canDelete={can(staff, "quotes:delete")}
            />
          </Panel>

          {linkedInvoice[0] && (
            <Panel title="Facture liée">
              <Link
                href={`/admin/factures?q=${linkedInvoice[0].ref}`}
                className="text-sm font-[650] text-fg underline underline-offset-4"
              >
                {linkedInvoice[0].ref}
              </Link>
            </Panel>
          )}

          {linkedRequest[0] && (
            <Panel title="Demande liée">
              <Link
                href={`/admin/demandes/${linkedRequest[0].id}`}
                className="text-sm font-[650] text-fg underline underline-offset-4"
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
      <dt className="text-fg/80">{label}</dt>
      <dd className="text-right font-[650] text-fg">{value}</dd>
    </div>
  );
}
