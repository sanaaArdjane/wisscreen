import type { Service } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { paletteText } from "@/lib/palette";

export function SolutionFeatures({ service }: { service: Service }) {
  return (
    <section id="fonctionnalites" className="section-tint texture-3d py-24 md:py-32 lg:py-40">
      <Container className="flex flex-col gap-16">
        <SectionHeading eyebrow="Fonctionnalités" title="Tout ce dont vous avez besoin, inclus." />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:gap-8 lg:grid-cols-3">
          {service.features.map((feature) => (
            <Reveal key={feature.title} className="flex flex-col gap-4 rounded-2xl bg-paper p-8 md:p-10">
              <span data-reveal-item className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-mist ${paletteText[service.palette.primary]}`}>
                <Icon name={feature.icon} className="h-5 w-5" />
              </span>
              <p data-reveal-item className="text-lg font-medium">{feature.title}</p>
              <p data-reveal-item className="text-base leading-relaxed text-ink/80">{feature.description}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
