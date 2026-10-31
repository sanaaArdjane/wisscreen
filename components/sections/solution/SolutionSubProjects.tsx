import type { Service } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export function SolutionSubProjects({ service }: { service: Service }) {
  if (!service.subProjects?.length) return null;

  return (
    <section id="sous-projets" className="section-mint py-24 md:py-32 lg:py-40">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="Sous-projets"
          title={`L'écosystème ${service.name}.`}
          description={`${service.name} regroupe plusieurs modules complémentaires — voici ceux déjà disponibles.`}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {service.subProjects.map((sub) => (
            <Reveal key={sub.name} className="flex flex-col gap-3 rounded-2xl bg-paper p-8 md:p-10">
              <p data-reveal-item className="text-xs font-medium uppercase tracking-[0.14em] text-signal">
                {sub.tagline}
              </p>
              <p data-reveal-item className="text-2xl font-medium">{sub.name}</p>
              <p data-reveal-item className="text-base leading-relaxed text-ink/80">{sub.description}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
