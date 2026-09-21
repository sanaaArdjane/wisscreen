import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { demoRuns, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel, StatTile } from "@/components/dashboard/PageHeader";
import { EmptyState } from "@/components/dashboard/ui";
import { DEMO_SCENARIOS } from "@/lib/demo";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Démos" };

const NAMES = new Map(DEMO_SCENARIOS.map((s) => [s.slug, s.name]));

export default async function AdminDemosPage() {
  const staff = await requirePermission("demos:read");

  const [runs, totals, perService] = await Promise.all([
    db
      .select({ run: demoRuns, client: userTable })
      .from(demoRuns)
      .innerJoin(userTable, eq(userTable.id, demoRuns.userId))
      .orderBy(desc(demoRuns.createdAt))
      .limit(100),
    db
      .select({
        total: sql<number>`count(*)::int`,
        blocked: sql<number>`count(*) filter (where ${demoRuns.outcome} = 'quota')::int`,
        people: sql<number>`count(distinct ${demoRuns.userId})::int`,
      })
      .from(demoRuns),
    db
      .select({ slug: demoRuns.serviceSlug, n: sql<number>`count(*)::int` })
      .from(demoRuns)
      .groupBy(demoRuns.serviceSlug)
      .orderBy(desc(sql`count(*)`)),
  ]);

  const t = totals[0];

  return (
    <>
      <PageHeader
        title="Démos"
        description="Ce que les clients essaient, et qui bute sur son quota."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Exécutions" value={t?.total ?? 0} icon="zap" />
        <StatTile label="Comptes actifs" value={t?.people ?? 0} icon="users" />
        <StatTile
          label="Bloquées par un quota"
          value={t?.blocked ?? 0}
          hint={(t?.blocked ?? 0) > 0 ? "Occasions de proposer une formule" : "Aucune"}
          icon="ban"
          tone={(t?.blocked ?? 0) > 0 ? "accent" : "cool"}
        />
        <StatTile
          label="Solution la plus testée"
          value={perService[0] ? (NAMES.get(perService[0].slug) ?? perService[0].slug) : "—"}
          hint={perService[0] ? `${perService[0].n} exécutions` : undefined}
          icon="bar-chart"
        />
      </div>

      <Panel className="mt-6" title="Historique" bodyClassName={runs.length ? "p-0" : undefined}>
        {runs.length === 0 ? (
          <EmptyState
            title="Aucune exécution"
            description="Les démos lancées depuis les espaces clients apparaîtront ici."
          />
        ) : (
          <ul className="divide-y divide-fg/10">
            {runs.map(({ run, client }) => (
              <li key={run.id} className="flex items-center gap-4 px-6 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">
                    {can(staff, "users:read") ? (
                      <Link
                        href={`/admin/utilisateurs/${client.id}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {client.name}
                      </Link>
                    ) : (
                      client.name
                    )}
                    <span className="text-fg/80"> — {NAMES.get(run.serviceSlug) ?? run.serviceSlug}</span>
                  </span>
                  <span className="block truncate text-xs text-fg/80">{run.input}</span>
                </span>
                <span className="shrink-0 text-xs text-fg/80">
                  {formatDateTime(run.createdAt)}
                </span>
                <span
                  className={
                    run.outcome === "ok"
                      ? "shrink-0 rounded-full border border-signal/45 bg-signal/10 px-2.5 py-0.5 text-xs text-fg"
                      : "shrink-0 rounded-full border border-fg/25 bg-fg/5 px-2.5 py-0.5 text-xs text-fg"
                  }
                >
                  {run.outcome === "ok" ? "Exécutée" : "Quota atteint"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
