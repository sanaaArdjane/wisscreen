import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import type { SectionContent } from "@/lib/content/schema";

export function MigrationProgram({ content }: { content: SectionContent<"migration"> }) {
  return (
    <section id="migration" className="bg-paper py-28 text-ink">
      <Container className="flex flex-col gap-16">
        <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
          <SectionHeading
            eyebrow={content.heading.eyebrow}
            title={content.heading.title}
            description={content.heading.description || undefined}
          />
          {content.cta.label && (
            <Button href={content.cta.href || "#contact"} variant="secondary" className="shrink-0">
              {content.cta.label}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {content.steps.map((step, index) => (
            <Reveal key={index} className="relative flex flex-col gap-3 border-t-2 border-ink/10 pt-6">
              <span data-reveal-item className="font-display text-sm font-semibold text-teal-deep">
                {String(index + 1).padStart(2, "0")}
              </span>
              <p data-reveal-item className="text-lg font-semibold">{step.title}</p>
              <p data-reveal-item className="text-sm leading-relaxed opacity-70">{step.text}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
