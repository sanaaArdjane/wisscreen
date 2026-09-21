import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { demoAccess, demoRuns, demos, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel, StatTile } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { pillPrimary } from "@/components/dashboard/pills";
import { Icon } from "@/components/ui/Icon";
import {
  BLOCK_LABELS,
  DEMO_LABELS,
  DEMO_STATUSES,
  DEMO_TONE,
  RUN_LABELS,
  RUN_TONE,
  parseBlocks,
  type DemoStatus,
} from "@/lib/demos";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Démos" };

/**
 * The demos the desk has authored, and the files customers are waiting on.
 *
 * The queue of `en_attente` / `en_cours` runs sits first because it is the
 * only part of this page with a customer waiting at the other end.
 */
export default async function AdminDemosPage({ searchParams }: PageProps<"/admin/demos">) {
  const staff = await requirePermission("demos:read");
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.statut === "string" ? params.statut : "";

  const [rows, queue, totals] = await Promise.all([
    db
      .select({
        demo: demos,
        grants: sql<number>`(select count(*)::int from ${demoAccess} where ${demoAccess.demoId} = ${demos.id} and ${demoAccess.revokedAt} is null)`,
        runs: sql<number>`(select count(*)::int from ${demoRuns} where ${demoRuns.demoId} = ${demos.id})`,
      })
      .from(demos)
      .where(
        and(
          DEMO_STATUSES.includes(status as DemoStatus) ? eq(demos.status, status) : undefined,
          q ? or(ilike(demos.title, `%${q}%`), ilike(demos.slug, `%${q}%`), ilike(demos.category, `%${q}%`)) : undefined,
        ),
      )
      .orderBy(desc(demos.updatedAt)),
    db
      .select({ run: demoRuns, client: userTable, demo: { id: demos.id, title: demos.title } })
      .from(demoRuns)
      .innerJoin(userTable, eq(userTable.id, demoRuns.userId))
      .leftJoin(demos, eq(demos.id, demoRuns.demoId))
      .where(or(eq(demoRuns.outcome, "en_attente"), eq(demoRuns.outcome, "en_cours")))
      .orderBy(desc(demoRuns.updatedAt))
      .limit(30),
    db
      .select({
        published: sql<number>`count(*) filter (where ${demos.status} = 'publie')::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(demos),
  ]);

  // Runs of the old simulator predate the `demos` table and belong to no demo.
  // They are history — what customers actually tried — so they stay visible.
  const legacy = await db
    .select({ run: demoRuns, client: userTable })
    .from(demoRuns)
    .innerJoin(userTable, eq(userTable.id, demoRuns.userId))
    .where(isNull(demoRuns.demoId))
    .orderBy(desc(demoRuns.createdAt))
    .limit(50);

  const [accessTotal] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(demoAccess)
    .where(sql`${demoAccess.revokedAt} is null`);

  const waiting = queue.filter((r) => r.run.outcome === "en_cours").length;

  return (
    <>
      <PageHeader
        title="Démos"
        description="Ce que vous mettez à disposition de vos clients pour évaluer un service : liens, identifiants, serveurs, guides, dépôts de fichiers."
        actions={
          can(staff, "demos:write") && (
            <Link href="/admin/demos/nouveau" className={pillPrimary}>
              <Icon name="plus" className="size-4" />
              Nouvelle démo
            </Link>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Démos publiées" value={totals[0]?.published ?? 0} hint={`${totals[0]?.total ?? 0} au total`} icon="zap" />
        <StatTile label="Accès actifs" value={accessTotal?.n ?? 0} icon="users" />
        <StatTile
          label="Fichiers à traiter"
          value={waiting}
          hint={waiting > 0 ? "Des clients attendent un résultat" : "Rien en attente"}
          icon="inbox"
          tone={waiting > 0 ? "accent" : "cool"}
        />
        <StatTile
          label="En attente d'envoi client"
          value={queue.length - waiting}
          icon="clock"
        />
      </div>

      {queue.length > 0 && (
        <Panel className="mt-6" title="File de traitement" bodyClassName="p-0">
          <ul className="divide-y divide-fg/10">
            {queue.map(({ run, client, demo }) => (
              <li key={run.id}>
                <Link
                  href={demo?.id ? `/admin/demos/${demo.id}#execution-${run.id}` : "/admin/demos"}
                  className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-soft"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-[650] text-fg">
                      {client.name} <span className="font-[450] text-fg/80">— {demo?.title ?? run.serviceSlug}</span>
                    </span>
                    <span className="block text-xs text-fg/80">Mis à jour le {formatDateTime(run.updatedAt)}</span>
                  </span>
                  <StatusChip label={RUN_LABELS[run.outcome] ?? run.outcome} tone={RUN_TONE[run.outcome] ?? RUN_TONE.en_attente} />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-6">
        <FilterBar
          basePath="/admin/demos"
          searchPlaceholder="Titre, adresse, catégorie…"
          filters={[
            {
              name: "statut",
              label: "Statut",
              value: status,
              options: [
                { value: "", label: "Tous" },
                ...DEMO_STATUSES.map((s) => ({ value: s, label: DEMO_LABELS[s] })),
              ],
            },
          ]}
        />
      </div>

      <Panel className="mt-4" bodyClassName={rows.length ? "p-0" : undefined}>
        {rows.length === 0 ? (
          <EmptyState
            title={q || status ? "Aucune démo ne correspond" : "Aucune démo pour l'instant"}
            description="Créez une démo : un lien vers la plateforme et un compte de test, un accès à un serveur, un guide PDF, ou un dépôt de fichier que vous traitez."
            action={
              can(staff, "demos:write") ? (
                <Link href="/admin/demos/nouveau" className={`${pillPrimary} mt-2`}>
                  Créer une démo
                </Link>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-fg/10">
            {rows.map(({ demo, grants, runs }) => {
              const kinds = Array.from(new Set(parseBlocks(demo.blocks).map((b) => b.kind)));
              return (
                <li key={demo.id}>
                  <Link
                    href={`/admin/demos/${demo.id}`}
                    className="flex flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-soft"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-[650] text-fg">{demo.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-fg/80">
                        {[demo.category, kinds.map((k) => BLOCK_LABELS[k].label).join(" · ") || "Vide"]
                          .filter(Boolean)
                          .join(" — ")}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-fg/80">
                      {demo.visibility === "all_clients" ? "Tous les clients" : `${grants} accès`}
                      {runs > 0 && ` · ${runs} exécution${runs > 1 ? "s" : ""}`}
                      {demo.expiresAt && ` · jusqu'au ${formatDate(demo.expiresAt)}`}
                    </span>
                    <StatusChip
                      label={DEMO_LABELS[demo.status as DemoStatus] ?? demo.status}
                      tone={DEMO_TONE[demo.status as DemoStatus] ?? DEMO_TONE.brouillon}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {legacy.length > 0 && (
        <Panel
          className="mt-6"
          title="Anciennes exécutions"
          description="Lancées sur l'ancien simulateur, avant que les démos soient préparées par l'équipe."
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-fg/10">
            {legacy.map(({ run, client }) => (
              <li key={run.id} className="flex items-center gap-4 px-6 py-3">
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {client.name} <span className="text-fg/80">— {run.serviceSlug}</span>
                </span>
                <span className="shrink-0 text-xs text-fg/80">{formatDateTime(run.createdAt)}</span>
                <StatusChip label={RUN_LABELS[run.outcome] ?? run.outcome} tone={RUN_TONE[run.outcome] ?? RUN_TONE.ok} />
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
