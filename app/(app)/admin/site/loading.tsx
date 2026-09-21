/**
 * Skeleton for every /admin/site page while its server component loads. Shaped
 * like the editors (a row of fields in a card) so the page doesn't jump when the
 * real form replaces it.
 */
export default function Loading() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-4 rounded-3xl p-6 ring-1 ring-fg/10">
          <div className="h-5 w-48 animate-pulse rounded-full bg-fg/10" />
          <div className="h-10 w-full animate-pulse rounded-2xl bg-fg/8" />
          <div className="h-10 w-3/4 animate-pulse rounded-2xl bg-fg/8" />
          <div className="h-24 w-full animate-pulse rounded-2xl bg-fg/8" />
        </div>
      ))}
    </div>
  );
}
