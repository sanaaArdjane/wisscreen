import type { QuotaView } from "@/lib/quotas";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

/**
 * One allowance, as a labelled bar.
 *
 * The bar is a real `<progress>`-shaped pair of divs with `role="progressbar"`
 * and the aria value attributes, because the number beside it is the whole
 * point of the component and it has to reach a screen reader too.
 *
 * The fill turns from `teal` to `signal` at 80% rather than to a red: the
 * palette is a cool family plus exactly one accent, so "pay attention" is the
 * accent's job. There is no red to reach for, and inventing one here would be
 * the first hue outside the system.
 */
export function QuotaMeter({ quota, showReset = false }: { quota: QuotaView; showReset?: boolean }) {
  const pct = Math.round(quota.ratio * 100);
  const nearLimit = quota.ratio >= 0.8;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-fg/80">{quota.label}</span>
        <span className="tabular-nums text-fg">
          {quota.unlimited ? (
            <span className="text-fg/80">Illimité</span>
          ) : !quota.included ? (
            <span className="text-fg/80">Non inclus</span>
          ) : (
            <>
              <strong className="font-[650]">{quota.used}</strong>
              <span className="text-fg/80"> / {quota.limit}</span>
            </>
          )}
        </span>
      </div>

      {quota.included && !quota.unlimited && (
        <div
          role="progressbar"
          aria-label={quota.label}
          aria-valuemin={0}
          aria-valuemax={quota.limit ?? undefined}
          aria-valuenow={quota.used}
          className="mt-2 h-2 overflow-hidden rounded-full bg-soft"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-500",
              nearLimit ? "bg-signal" : "bg-fg",
            )}
            style={{ width: `${Math.max(pct, quota.used > 0 ? 3 : 0)}%` }}
          />
        </div>
      )}

      {showReset && quota.resetsAt && (
        <p className="mt-1 text-xs text-fg/80">
          Réinitialisation le {formatDate(quota.resetsAt)}
        </p>
      )}
    </div>
  );
}
