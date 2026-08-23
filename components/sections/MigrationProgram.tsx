import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";

const STEPS = [
  { title: "Audit", text: "Nous étudions vos process actuels et identifions les solutions Wissal Univers les plus pertinentes." },
  { title: "Plan de migration", text: "Un plan par étapes est défini pour limiter l'impact sur vos opérations en cours." },
  { title: "Déploiement accompagné", text: "Nos équipes vous accompagnent pendant tout le déploiement, environnement de test compris." },
  { title: "Formation", text: "Vos équipes sont formées à l'utilisation des tableaux de bord et des API." },
];

export function MigrationProgram() {
  return (
    <section className="bg-paper py-28 text-ink">
      <Container className="flex flex-col gap-16">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading
            eyebrow="Accompagnement à la migration"
            title="Passer à Wissal Univers, sans friction."
            description="Que vous remplaciez un système existant ou partiez de zéro, notre équipe vous accompagne à chaque étape."
          />
          <Button href="#contact" variant="secondary" className="shrink-0">
            Démarrer un projet
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} className="relative flex flex-col gap-3 border-t-2 border-ink/10 pt-6">
              <span data-reveal-item className="font-display text-sm font-semibold text-teal-deep">
                0{index + 1}
              </span>
              <p data-reveal-item className="text-lg font-semibold">{step.title}</p>
              <p data-reveal-item className="text-sm leading-relaxed opacity-70">{step.text}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
