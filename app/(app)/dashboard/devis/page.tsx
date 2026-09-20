import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { listQuotes } from "@/lib/server/queries";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { QUOTE_LABELS, QUOTE_TONE, isQuoteStatus } from "@/lib/billing";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Devis" };

export default async function DevisPage() {
  const user = await requireUser("/dashboard/devis");
  const rows = await listQuotes(user.id);

  return (
    <>
      <PageHeader
        title="Devis"
        description="Les propositions chiffrées que nous vous avons adressées."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Aucun devis pour l'instant"
          description="Un devis apparaît ici dès que notre équipe chiffre l'une de vos demandes."
          action={
            <Link
              href="/dashboard/demandes/nouvelle?type=devis"
              className="control-signal mt-2 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium"
            >
              Demander un devis
            </Link>
          }
        />
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-ink/10">
            {rows.map(({ quote }) => {
              const status = isQuoteStatus(quote.status) ? quote.status : "brouillon";
              return (
                <li key={quote.id}>
                  <Link
                    href={`/dashboard/devis/${quote.id}`}
                    className="flex flex-col gap-2 px-5 py-4 transition-colors hover:bg-mist sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{quote.title}</p>
                      <p className="mt-0.5 text-xs text-ink/80">
                        {quote.ref} · émis le {formatDate(quote.createdAt)}
                        {quote.validUntil && ` · valable jusqu'au ${formatDate(quote.validUntil)}`}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-ink">
                      {formatMoney(quote.amountCents, quote.currency)}
                    </span>
                    <StatusChip label={QUOTE_LABELS[status]} tone={QUOTE_TONE[status]} />
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
