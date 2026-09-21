import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { pillPrimary } from "@/components/dashboard/pills";
import { Icon } from "@/components/ui/Icon";
import { listEntitledDemos } from "@/lib/server/demos";
import { BLOCK_LABELS } from "@/lib/demos";
import { getSolutions } from "@/lib/content";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Mes démos" };

/**
 * The demos WICLOUD has opened for this customer.
 *
 * It used to be four simulated sandboxes every account saw; a demo is now
 * something the desk prepares and hands to a named customer, so an account
 * with none gets a way to ask for one rather than a fake to play with.
 */
export default async function DemosPage() {
  const user = await requireUser("/dashboard/demos");
  const [demos, SERVICES] = await Promise.all([listEntitledDemos(user.id), getSolutions({ includeHidden: true })]);
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

  return (
    <>
      <PageHeader
        title="Mes démos"
        description="Les accès de démonstration préparés pour vous par notre équipe : plateformes, comptes de test, serveurs et documents."
        actions={
          <Link href="/dashboard/demandes/nouvelle?type=demo" className={pillPrimary}>
            <Icon name="plus" className="size-4" />
            Demander une démo
          </Link>
        }
      />

      {demos.length === 0 ? (
        <EmptyState
          title="Aucune démo pour l'instant"
          description="Dites-nous quelle solution vous voulez évaluer : nous vous préparons un accès, un compte de test ou un environnement dédié."
          action={
            <Link href="/dashboard/demandes/nouvelle?type=demo" className={`${pillPrimary} mt-2`}>
              Demander une démo
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {demos.map(({ demo, blocks, expiresAt }) => {
            const service = SERVICES.find((s) => s.slug === demo.serviceSlug);
            const kinds = Array.from(new Set(blocks.map((b) => b.kind)));
            const expiringSoon = expiresAt && expiresAt < soon;
            return (
              <li key={demo.id}>
                <Link
                  href={`/dashboard/demos/${demo.slug}`}
                  className="flex h-full flex-col gap-3 rounded-3xl border border-fg/10 bg-panel p-6 transition-colors hover:border-fg/25"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {(demo.category || service) && (
                      <span className="text-xs font-[650] uppercase tracking-wide text-signal-fg">
                        {demo.category || service?.name}
                      </span>
                    )}
                    {expiringSoon && (
                      <StatusChip label={`Jusqu'au ${formatDate(expiresAt)}`} tone="bg-signal/15 text-fg border-signal/45" />
                    )}
                  </div>
                  <p className="text-lg font-[650] leading-tight text-fg">{demo.title}</p>
                  {demo.summary && <p className="line-clamp-3 text-sm text-fg/80">{demo.summary}</p>}
                  <p className="mt-auto flex flex-wrap gap-1.5 pt-2">
                    {kinds.map((k) => (
                      <span key={k} className="rounded-full bg-soft px-2.5 py-1 text-xs text-fg">
                        {BLOCK_LABELS[k].label}
                      </span>
                    ))}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
