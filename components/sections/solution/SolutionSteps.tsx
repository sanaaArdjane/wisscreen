import type { Service } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { paletteText } from "@/lib/palette";

export function SolutionSteps({ service }: { service: Service }) {
  return (
    <section id="etapes" className="section-paper py-24 text-ink md:py-32 lg:py-40">
      <Container className="flex flex-col gap-16">
        <SectionHeading eyebrow="Comment ça marche" title="Un parcours simple, de bout en bout." align="center" />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {service.steps.map((step, index) => (
            <Reveal key={step.title} className="relative flex flex-col gap-3 border-t-2 border-ink/10 pt-6">
              <span data-reveal-item className={`font-display text-sm font-medium ${paletteText[service.palette.primary]}`}>
                0{index + 1}
              </span>
              <p data-reveal-item className="text-lg font-medium">{step.title}</p>
              <p data-reveal-item className="text-base leading-relaxed text-ink/80">{step.description}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
