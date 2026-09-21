import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { quotes, requests } from "@/lib/db/schema";
import { requireUser } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { StatusChip } from "@/components/dashboard/ui";
import { MoneyLines } from "@/components/dashboard/MoneyLines";
import { QuoteDecision } from "./QuoteDecision";
import { QUOTE_LABELS, QUOTE_TONE, isQuoteExpired, isQuoteStatus } from "@/lib/billing";
import { formatDate } from "@/lib/format";
import { getDocumentCompany } from "@/lib/settings";
import { pillSmall } from "@/components/dashboard/pills";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Devis" };

export default async function DevisDetailPage({ params }: PageProps<"/dashboard/devis/[id]">) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();

  const user = await requireUser(`/dashboard/devis/${id}`);

  // Ownership *and* "not a draft" in the WHERE: a quote the desk is still
  // writing must 404 for the client, not render as a half-finished document.
  const [row] = await db
    .select({ quote: quotes, request: requests })
    .from(quotes)
    .leftJoin(requests, eq(requests.id, quotes.requestId))
    .where(
      and(
        eq(quotes.id, numericId),
        eq(quotes.userId, user.id),
        sql`${quotes.status} <> 'brouillon'`,
      ),
    )
    .limit(1);
  if (!row) notFound();

  const { quote, request } = row;
  const company = await getDocumentCompany(quote.overrides);
  const status = isQuoteStatus(quote.status) ? quote.status : "brouillon";
  const expired = isQuoteExpired(quote);

  return (
    <>
      <PageHeader
        title={quote.title}
        description={`${quote.ref} · émis le ${formatDate(quote.createdAt)}`}
        backHref="/dashboard/devis"
        backLabel="Mes devis"
        actions={
          <StatusChip
            label={expired ? QUOTE_LABELS.expire : QUOTE_LABELS[status]}
            tone={expired ? QUOTE_TONE.expire : QUOTE_TONE[status]}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Détail">
          <MoneyLines
            lines={quote.lines}
            total={quote.amountCents}
            currency={quote.currency}
            vatRate={company.vatRate}
          />
          {quote.note && (
            <p className="mt-6 whitespace-pre-wrap border-t border-fg/10 pt-4 text-sm text-fg/80">
              {quote.note}
            </p>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Document">
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/documents/devis/${quote.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className={pillSmall}
              >
                <Icon name="file-text" className="size-4" />
                Voir le PDF
              </a>
              <a href={`/api/documents/devis/${quote.id}?download=1`} className={pillSmall}>
                <Icon name="download" className="size-4" />
                Télécharger
              </a>
            </div>
          </Panel>

          <Panel title="Votre réponse">
            {status === "envoye" && !expired ? (
              <>
                <p className="mb-4 text-sm text-fg/80">
                  {quote.validUntil
                    ? `Ce devis est valable jusqu'au ${formatDate(quote.validUntil)}.`
                    : "Ce devis est en attente de votre réponse."}
                </p>
                <QuoteDecision quoteId={quote.id} />
              </>
            ) : expired ? (
              <p className="text-sm text-fg/80">
                Ce devis a expiré le {formatDate(quote.validUntil)}. Demandez-nous une mise à
                jour depuis la demande liée.
              </p>
            ) : status === "accepte" ? (
              <p className="text-sm text-fg/80">
                Vous avez accepté ce devis. Notre équipe a été prévenue.
              </p>
            ) : (
              <p className="text-sm text-fg/80">Ce devis a été refusé.</p>
            )}
          </Panel>

          {request && (
            <Panel title="Demande liée">
              <Link
                href={`/dashboard/demandes/${request.id}`}
                className="text-sm font-[650] text-fg underline underline-offset-4"
              >
                {request.ref} — {request.title}
              </Link>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
