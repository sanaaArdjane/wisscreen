import type { MoneyLine } from "@/lib/db/schema";
import { formatMoney, lineTotalCents } from "@/lib/money";

/**
 * The line items of a quote or an invoice.
 *
 * `total` is passed in rather than summed here: the stored `amountCents` is the
 * figure the client was actually sent, and recomputing it on render would
 * silently paper over a mismatch instead of showing what was agreed. If the two
 * ever diverge, the stored one is the document.
 */
export function MoneyLines({
  lines,
  total,
  currency = "DZD",
}: {
  lines: MoneyLine[];
  total: number;
  currency?: string;
}) {
  if (lines.length === 0) {
    return (
      <p className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-ink/80">Montant</span>
        <span className="text-lg font-semibold tabular-nums text-ink">
          {formatMoney(total, currency)}
        </span>
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Détail des lignes</caption>
      <thead>
        <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wider text-ink/80">
          <th scope="col" className="pb-2 font-medium">
            Désignation
          </th>
          <th scope="col" className="pb-2 text-right font-medium">
            Qté
          </th>
          <th scope="col" className="pb-2 text-right font-medium">
            P.U.
          </th>
          <th scope="col" className="pb-2 text-right font-medium">
            Total
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-ink/5">
        {lines.map((line, i) => (
          <tr key={`${line.label}-${i}`}>
            <td className="py-2 pr-3 text-ink">{line.label}</td>
            <td className="py-2 text-right tabular-nums text-ink/80">{line.quantity}</td>
            <td className="py-2 text-right tabular-nums text-ink/80">
              {formatMoney(line.unitCents, currency)}
            </td>
            <td className="py-2 text-right font-medium tabular-nums text-ink">
              {formatMoney(lineTotalCents(line), currency)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-ink/15">
          <th scope="row" colSpan={3} className="pt-3 text-right font-medium text-ink/80">
            Total
          </th>
          <td className="pt-3 text-right text-lg font-semibold tabular-nums text-ink">
            {formatMoney(total, currency)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
