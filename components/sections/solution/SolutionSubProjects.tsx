import type { Service } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export function SolutionSubProjects({ service }: { service: Service }) {
  if (!service.subProjects?.length) return null;

  return (
    <section className="bg-paper py-28 text-ink">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="Sous-projets"
          title={`L'écosystème ${service.name}.`}
          description={`${service.name} regroupe plusieurs modules complémentaires — voici ceux déjà disponibles.`}
        />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {service.subProjects.map((sub) => (
            <Reveal key={sub.name} className="flex flex-col gap-3 rounded-3xl border border-ink/10 p-8">
              <p data-reveal-item className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-deep">
                {sub.tagline}
              </p>
              <p data-reveal-item className="text-2xl font-semibold">{sub.name}</p>
              <p data-reveal-item className="text-sm leading-relaxed opacity-70">{sub.description}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
