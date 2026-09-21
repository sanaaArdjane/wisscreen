import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/guard";
import { listDemoRuns } from "@/lib/server/queries";
import { listQuotas } from "@/lib/quotas";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { QuotaMeter } from "@/components/dashboard/QuotaMeter";
import { DEMO_SCENARIOS } from "@/lib/demo";
import type { DemoResult } from "@/lib/demo";
import { DemoRunner } from "./DemoRunner";
import { formatDateTime } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";
import { pillSmall } from "@/components/dashboard/pills";

export const metadata: Metadata = { title: "Essayer nos solutions" };

export default async function DemosPage() {
  const user = await requireUser("/dashboard/demos");

  const [runs, quotas] = await Promise.all([listDemoRuns(user.id, 30), listQuotas(user.id)]);
  const demoQuota = quotas.find((q) => q.metric === "demo.runs");

  // The most recent successful run per scenario, so each card comes back with
  // its last result after a reload instead of an empty panel.
  const lastBySlug = new Map<string, DemoResult>();
  for (const { run } of runs) {
    if (run.outcome === "ok" && run.result && !lastBySlug.has(run.serviceSlug)) {
      lastBySlug.set(run.serviceSlug, run.result as unknown as DemoResult);
    }
  }

  return (
    <>
      <PageHeader
        title="Essayer nos solutions"
        description="Un bac à sable pour voir ce que fait chaque solution, sans installer quoi que ce soit."
      />

      {/* Said once, at the top, in plain language — not buried in a footnote.
          Someone will screenshot a result; they should know what it is. */}
      <div className="mb-6 flex gap-3 rounded-2xl border border-fg/15 bg-panel px-6 py-4">
        <Icon name="sparkles" className="mt-0.5 size-5 shrink-0 text-signal-fg" />
        <div className="text-sm text-fg/80">
          <p className="font-[650] text-fg">Ces démonstrations sont simulées.</p>
          <p className="mt-1">
            Elles reproduisent le format des réponses de nos moteurs à partir de vos saisies,
            pour montrer la mécanique et l&apos;intégration. Pour un essai sur vos données
            réelles,{" "}
            <Link
              href="/dashboard/demandes/nouvelle?type=demo"
              className="font-[650] text-fg underline underline-offset-4"
            >
              demandez une démo accompagnée
            </Link>
            .
          </p>
        </div>
      </div>

      {demoQuota && (
        <Panel className="mb-6" title="Votre quota de démos">
          <QuotaMeter quota={demoQuota} showReset />
        </Panel>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        {DEMO_SCENARIOS.map((scenario) => (
          <Panel
            key={scenario.slug}
            title={`${scenario.name} — ${scenario.title}`}
            description={scenario.description}
            actions={
              <Link
                href={`/solutions/${scenario.slug}`}
                className={pillSmall}
              >
                La solution
              </Link>
            }
          >
            <DemoRunner
              slug={scenario.slug}
              inputLabel={scenario.inputLabel}
              placeholder={scenario.inputPlaceholder}
              sample={scenario.sample}
              lastResult={lastBySlug.get(scenario.slug) ?? null}
            />
          </Panel>
        ))}
      </div>

      <Panel className="mt-6" title="Historique" bodyClassName={runs.length ? "p-0" : undefined}>
        {runs.length === 0 ? (
          <p className="text-sm text-fg/80">Aucune exécution pour l&apos;instant.</p>
        ) : (
          <ul className="divide-y divide-fg/10">
            {runs.map(({ run }) => (
              <li key={run.id} className="flex items-center gap-4 px-6 py-3.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-fg">
                    {DEMO_SCENARIOS.find((s) => s.slug === run.serviceSlug)?.name ??
                      run.serviceSlug}
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
                      : "shrink-0 rounded-full border border-fg/20 bg-fg/5 px-2.5 py-0.5 text-xs text-fg/80"
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
