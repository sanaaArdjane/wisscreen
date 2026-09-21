import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import type { SectionContent } from "@/lib/content/schema";

export function DataCommitment({ content }: { content: SectionContent<"commitment"> }) {
  return (
    <section id="commitment" className="section-ink py-28">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          description={content.heading.description || undefined}
        />

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {content.items.map((pillar, i) => (
            <Reveal key={i} className="flex flex-col gap-4">
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
