import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/types";

const PILLARS: { icon: IconName; title: string; text: string }[] = [
  { icon: "globe", title: "Hébergement souverain", text: "Vos données restent hébergées dans un environnement dont vous connaissez et contrôlez la localisation, via WICLOUD." },
  { icon: "shield", title: "Minimisation des données", text: "Nous ne collectons et ne conservons que les données strictement nécessaires au fonctionnement de chaque solution." },
  { icon: "check", title: "Transparence", text: "Nos partenaires savent précisément quelles données sont traitées, où, et pourquoi." },
];

export function DataCommitment() {
  return (
    <section id="commitment" className="section-ink py-28">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="Souveraineté & responsabilité"
          title="Vos données méritent d'être traitées avec sérieux."
          description="La confiance des banques et des particuliers repose sur des engagements clairs — voici les nôtres."
        />

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <Reveal key={pillar.title} className="flex flex-col gap-4">
              <span data-reveal-item className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-aqua">
                <Icon name={pillar.icon} className="h-5 w-5" />
              </span>
              <p data-reveal-item className="text-lg font-semibold">{pillar.title}</p>
              <p data-reveal-item className="text-sm leading-relaxed opacity-65">{pillar.text}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
