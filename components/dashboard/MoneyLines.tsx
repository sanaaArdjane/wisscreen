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
        <span className="text-fg/80">Montant</span>
        <span className="text-2xl font-[650] tabular-nums text-fg">
          {formatMoney(total, currency)}
        </span>
      </p>
    );
  }

  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Détail des lignes</caption>
      <thead>
        <tr className="text-left text-xs text-fg/80">
          <th scope="col" className="rounded-l-2xl bg-soft px-4 py-2.5 font-[650]">
            Désignation
          </th>
          <th scope="col" className="bg-soft px-4 py-2.5 text-right font-[650]">
            Qté
          </th>
          <th scope="col" className="bg-soft px-4 py-2.5 text-right font-[650]">
            P.U.
          </th>
          <th scope="col" className="rounded-r-2xl bg-soft px-4 py-2.5 text-right font-[650]">
            Total
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-fg/10">
        {lines.map((line, i) => (
          <tr key={`${line.label}-${i}`}>
            <td className="px-4 py-3 text-fg">{line.label}</td>
            <td className="px-4 py-3 text-right tabular-nums text-fg/80">{line.quantity}</td>
            <td className="px-4 py-3 text-right tabular-nums text-fg/80">
              {formatMoney(line.unitCents, currency)}
            </td>
            <td className="px-4 py-3 text-right font-[650] tabular-nums text-fg">
              {formatMoney(lineTotalCents(line), currency)}
            </td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" colSpan={3} className="px-4 pt-4 text-right font-[450] text-fg/80">
            Total
          </th>
          <td className="px-4 pt-4 text-right text-2xl font-[650] tabular-nums text-fg">
            {formatMoney(total, currency)}
          </td>
        </tr>
      </tfoot>
    </table>
  );
}
