import type { Metadata } from "next";
import Link from "next/link";
import { readSolutionRecords } from "@/lib/content";
import { getCurrentUser } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { Panel } from "@/components/dashboard/PageHeader";
import { ConfirmButton } from "@/components/dashboard/ui";
import { NewSolutionForm } from "@/components/dashboard/site/NewSolutionForm";
import { FieldHint } from "@/components/dashboard/site/FieldHint";
import { Icon } from "@/components/ui/Icon";
import { deleteSolution, moveSolution, toggleSolution } from "../actions";

export const metadata: Metadata = { title: "Solutions — Configuration du site" };

const btn =
  "flex h-9 w-9 items-center justify-center rounded-full text-fg ring-1 ring-fg/15 hover:bg-fg/8 disabled:opacity-40 disabled:hover:bg-transparent";

export default async function SolutionsAdminPage() {
  const [{ records, fromDefaults }, user] = await Promise.all([readSolutionRecords(), getCurrentUser()]);
  const writable = Boolean(user && can(user, "site:write"));

  return (
    <div className="flex flex-col gap-6">
      <Panel
        title="Solutions"
        description="Leur ordre ici est l'ordre du site : menu, carrousel, grilles, visuel 3D. Une solution masquée disparaît du site et sa page renvoie une erreur 404."
      >
        {fromDefaults && (
          <p className="mb-4 rounded-2xl bg-soft px-4 py-3 text-sm text-fg">
            Ce sont les quatre solutions fournies avec le site. Elles seront copiées dans la base à votre première
            modification — rien ne change pour les visiteurs.
          </p>
        )}
        <p className="mb-3 flex items-center gap-2 text-sm text-fg/80">
          Ordre d&apos;affichage
          <FieldHint
            where={{
              page: "home",
              section: "Toute la page d'accueil",
              detail: "Menu du haut, carrousel « L'essentiel », visuel 3D, « Toutes nos solutions », pied de page",
              anchor: "highlights",
            }}
          />
        </p>
        <ol className="flex flex-col divide-y divide-fg/10 rounded-2xl ring-1 ring-fg/10">
          {records.map((r, i) => (
            <li key={r.slug} className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
              <span className="w-6 text-center font-mono text-xs font-[650] text-fg">{i + 1}</span>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-soft text-fg">
                <Icon name={r.content.icon} className="h-5 w-5" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="flex flex-wrap items-center gap-2 font-[650] text-fg">
                  {r.content.name}
                  {r.published ? (
                    <span className="rounded-full bg-signal/15 px-2 py-0.5 text-[11px] text-fg ring-1 ring-signal/45">Publiée</span>
                  ) : (
                    <span className="rounded-full px-2 py-0.5 text-[11px] text-fg ring-1 ring-fg/30">Masquée</span>
                  )}
                </span>
                <span className="truncate font-mono text-xs text-fg/80">/solutions/{r.slug}</span>
              </span>

              {writable && (
                <span className="flex items-center gap-1.5">
                  <form action={moveSolution}>
                    <input type="hidden" name="slug" value={r.slug} />
                    <input type="hidden" name="dir" value="up" />
                    <button className={btn} disabled={i === 0} aria-label={`Monter ${r.content.name}`} title="Monter">
                      <Icon name="chevron-down" className="h-4 w-4 rotate-180" />
                    </button>
                  </form>
                  <form action={moveSolution}>
                    <input type="hidden" name="slug" value={r.slug} />
                    <input type="hidden" name="dir" value="down" />
                    <button className={btn} disabled={i === records.length - 1} aria-label={`Descendre ${r.content.name}`} title="Descendre">
                      <Icon name="chevron-down" className="h-4 w-4" />
                    </button>
                  </form>
                  <form action={toggleSolution}>
                    <input type="hidden" name="slug" value={r.slug} />
                    <button className="rounded-full px-3 py-2 text-sm font-[650] text-fg ring-1 ring-fg/15 hover:bg-fg/8">
                      {r.published ? "Masquer" : "Publier"}
                    </button>
                  </form>
                </span>
              )}
              <Link
                href={`/admin/site/solutions/${r.slug}`}
                className="rounded-full bg-fg px-4 py-2 text-sm font-[650] text-on-fg hover:opacity-90"
              >
                Modifier
              </Link>
              {r.published && (
                <a
                  href={`/solutions/${r.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Voir la page ${r.content.name}`}
                  className={btn}
                >
                  <Icon name="external" className="h-4 w-4" />
                </a>
              )}
            </li>
          ))}
        </ol>
      </Panel>

      {writable && (
        <>
          <Panel title="Ajouter une solution" description="Elle est créée masquée : remplissez-la, puis publiez-la.">
            <NewSolutionForm />
          </Panel>

          <Panel title="Supprimer une solution" description="Définitif : sa page, ses textes et ses réglages de médias disparaissent. Les fichiers téléversés restent dans le stockage.">
            <ul className="flex flex-col gap-3">
              {records.map((r) => (
                <li key={r.slug} className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-[650] text-fg">{r.content.name}</span>
                  <ConfirmButton
                    action={deleteSolution}
                    hidden={{ slug: r.slug }}
                    label={`Supprimer ${r.content.name}`}
                    description={`La page /solutions/${r.slug} n'existera plus et ${r.content.name} disparaîtra de tout le site. Pour la retirer temporairement, préférez « Masquer ».`}
                    typeToConfirm={r.slug}
                    typeToConfirmLabel={`Tapez « ${r.slug} » pour confirmer`}
                  />
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </div>
  );
}
