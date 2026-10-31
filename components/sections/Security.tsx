import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import type { SectionContent } from "@/lib/content/schema";

export function Security({ content }: { content: SectionContent<"security"> }) {
  return (
    <section id="security" className="section-paper py-24 md:py-32 lg:py-40 text-ink">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          align="center"
          description={content.heading.description || undefined}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:gap-8">
          {content.items.map((pillar, i) => (
            <Reveal key={i} className="flex flex-col items-center gap-4 rounded-2xl bg-mist p-8 text-center md:p-10">
              <span data-reveal-item className="flex h-14 w-14 items-center justify-center rounded-2xl bg-paper text-signal">
                <Icon name={pillar.icon} className="h-6 w-6" />
              </span>
              <p data-reveal-item className="text-lg font-medium">{pillar.title}</p>
              <p data-reveal-item className="max-w-xs text-base leading-relaxed text-ink/80">{pillar.text}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
