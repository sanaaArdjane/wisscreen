import type { Service } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { paletteText } from "@/lib/palette";

export function SolutionFeatures({ service }: { service: Service }) {
  return (
    <section className="section-ink py-28">
      <Container className="flex flex-col gap-16">
        <SectionHeading eyebrow="Fonctionnalités" title="Tout ce dont vous avez besoin, inclus." />

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {service.features.map((feature) => (
            <Reveal key={feature.title} className="flex flex-col gap-4 rounded-3xl border border-white/10 p-7">
              <span data-reveal-item className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ${paletteText[service.palette.primary]}`}>
                <Icon name={feature.icon} className="h-5 w-5" />
              </span>
              <p data-reveal-item className="text-lg font-semibold">{feature.title}</p>
              <p data-reveal-item className="text-sm leading-relaxed opacity-65">{feature.description}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
