import type { Metadata } from "next";
import { requireUser } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { getSolutions } from "@/lib/content";
import { REQUEST_TYPES, TYPE_LABELS } from "@/lib/requests";
import { NewRequestForm } from "./NewRequestForm";

export const metadata: Metadata = { title: "Nouvelle demande" };

export default async function NouvelleDemandePage({
  searchParams,
}: PageProps<"/dashboard/demandes/nouvelle">) {
  await requireUser("/dashboard/demandes/nouvelle");
  const { solution, type, title } = await searchParams;

  return (
    <>
      <PageHeader
        title="Nouvelle demande"
        description="Un formulaire, un interlocuteur, un fil de discussion qui garde tout l'historique."
        backHref="/dashboard/demandes"
        backLabel="Mes demandes"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <NewRequestForm
            typeOptions={REQUEST_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
            serviceOptions={(await getSolutions()).map((s) => ({ value: s.slug, label: s.name }))}
            defaultType={typeof type === "string" ? type : undefined}
            defaultService={typeof solution === "string" ? solution : undefined}
            defaultTitle={typeof title === "string" ? title.slice(0, 160) : undefined}
          />
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title="Ce qui se passe ensuite">
            <ol className="flex flex-col gap-4 text-sm text-fg/80">
              {[
                "Votre demande arrive immédiatement dans notre back-office.",
                "Un membre de l'équipe se l'attribue et vous répond dans le fil.",
                "Si elle nécessite un chiffrage, un devis vous est adressé ici même, en PDF.",
                "Un service souscrit (serveur, SMTP, IA…) apparaît ensuite dans « Mes services ».",
                "Vous suivez l'avancement jusqu'à la clôture, sans échange d'e-mails.",
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-fg text-xs font-[650] text-on-fg">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
