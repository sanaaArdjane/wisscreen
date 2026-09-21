import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { quotes, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { pillPrimary } from "@/components/dashboard/pills";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { QUOTE_LABELS, QUOTE_STATUSES, QUOTE_TONE, isQuoteStatus } from "@/lib/billing";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

export const metadata: Metadata = { title: "Devis" };

export default async function AdminDevisPage({ searchParams }: PageProps<"/admin/devis">) {
  const staff = await requirePermission("quotes:read");
  const { q, statut } = await searchParams;

  const filters: SQL[] = [];
  const status = typeof statut === "string" ? statut : "tous";
  if (isQuoteStatus(status)) filters.push(eq(quotes.status, status));

  const search = typeof q === "string" ? q.trim() : "";
  if (search) {
    const like = `%${search}%`;
    filters.push(
      or(ilike(quotes.ref, like), ilike(quotes.title, like), ilike(userTable.name, like))!,
    );
  }

  const rows = await db
    .select({ quote: quotes, client: userTable })
    .from(quotes)
    .innerJoin(userTable, eq(userTable.id, quotes.userId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(quotes.createdAt))
    .limit(200);

  return (
    <>
      <PageHeader
        title="Devis"
        description="Chiffrages envoyés aux clients et réponses reçues."
        actions={
          can(staff, "quotes:write") && (
            <Link
              href="/admin/devis/nouveau"
              className={pillPrimary}
            >
              <Icon name="plus" className="size-4" />
              Nouveau devis
            </Link>
          )
        }
      />

      <FilterBar
        basePath="/admin/devis"
        searchPlaceholder="Référence, intitulé, client…"
        filters={[
          {
            name: "statut",
            label: "Statut",
            value: status,
            options: [
              { value: "tous", label: "Tous" },
              ...QUOTE_STATUSES.map((s) => ({ value: s, label: QUOTE_LABELS[s] })),
            ],
          },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Aucun devis"
          description="Créez-en un depuis une demande, ou directement ici."
        />
      ) : (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-fg/10">
            {rows.map(({ quote, client }) => {
              const s = isQuoteStatus(quote.status) ? quote.status : "brouillon";
              return (
                <li key={quote.id}>
                  <Link
                    href={`/admin/devis/${quote.id}`}
                    className="flex flex-col gap-2 px-6 py-4 transition-colors hover:bg-soft sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-[650] text-fg">{quote.title}</p>
                      <p className="mt-0.5 truncate text-xs text-fg/80">
                        {quote.ref} · {client.name} · {formatDate(quote.createdAt)}
                      </p>
                    </div>
                    <span className="text-sm font-[650] tabular-nums text-fg">
                      {formatMoney(quote.amountCents, quote.currency)}
                    </span>
                    <StatusChip label={QUOTE_LABELS[s]} tone={QUOTE_TONE[s]} />
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
