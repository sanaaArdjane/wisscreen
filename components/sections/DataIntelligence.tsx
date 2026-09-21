import type { Service } from "@/lib/types";
import type { SectionContent } from "@/lib/content/schema";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

export function DataIntelligence({
  content,
  solution,
}: {
  content: SectionContent<"dataIntelligence">;
  /** The solution whose `cover` fills the panel (`content.solutionSlug`). */
  solution?: Service;
}) {
  return (
    <section id="data-intelligence" className="bg-paper py-28 text-ink">
      <Container className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <Reveal className="order-2 flex flex-col gap-8 lg:order-1">
          <div data-reveal-item>
            <SectionHeading
              eyebrow={content.heading.eyebrow}
              title={content.heading.title}
              description={content.heading.description || undefined}
            />
          </div>
          <div className="flex flex-col gap-6">
            {content.points.map((point, i) => (
              <div key={i} data-reveal-item className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink/5 text-teal-deep">
                  <Icon name={point.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{point.title}</p>
                  <p className="mt-1 text-sm leading-relaxed opacity-70">{point.text}</p>
                </div>
              </div>
            ))}
          </div>
          {content.cta.label && (
            <div data-reveal-item>
              <Button href={content.cta.href || "#"} variant="secondary">
                {content.cta.label}
              </Button>
            </div>
          )}
        </Reveal>

        <Reveal className="order-1 lg:order-2">
          <div data-reveal-item>
            {solution && <MediaSlot slot={solution.media.hero} accent={solution.palette.primary} />}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
