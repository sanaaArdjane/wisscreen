import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import type { SectionContent } from "@/lib/content/schema";

export function ScaleSpecs({ content }: { content: SectionContent<"scale"> }) {
  return (
    <section id="scale" className="section-ink py-28">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          align="center"
          description={content.heading.description || undefined}
        />

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {content.specs.map((spec, i) => (
            <Reveal key={i} className="flex flex-col gap-4 bg-ink p-8">
              <span data-reveal-item className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-aqua">
                <Icon name={spec.icon} className="h-5 w-5" />
              </span>
              <p data-reveal-item className="font-display text-2xl font-semibold">{spec.value}</p>
              <p data-reveal-item className="text-sm leading-relaxed opacity-65">{spec.label}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
