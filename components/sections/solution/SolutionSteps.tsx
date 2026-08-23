import type { Service } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { paletteText } from "@/lib/palette";

export function SolutionSteps({ service }: { service: Service }) {
  return (
    <section className="bg-paper py-28 text-ink">
      <Container className="flex flex-col gap-16">
        <SectionHeading eyebrow="Comment ça marche" title="Un parcours simple, de bout en bout." align="center" />

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {service.steps.map((step, index) => (
            <Reveal key={step.title} className="relative flex flex-col gap-3 border-t-2 border-ink/10 pt-6">
              <span data-reveal-item className={`font-display text-sm font-semibold ${paletteText[service.palette.primary]}`}>
                0{index + 1}
              </span>
              <p data-reveal-item className="text-lg font-semibold">{step.title}</p>
              <p data-reveal-item className="text-sm leading-relaxed opacity-70">{step.description}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
