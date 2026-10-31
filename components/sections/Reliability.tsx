import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";
import { StatCounter } from "@/components/ui/StatCounter";
import type { SectionContent } from "@/lib/content/schema";

export function Reliability({ content }: { content: SectionContent<"reliability"> }) {
  return (
    <section id="reliability" className="section-mint relative overflow-hidden texture-3d py-24 text-ink md:py-32 lg:py-40">
      <Container className="relative flex flex-col items-center gap-10 text-center">
        <Reveal>
          <Badge data-reveal-item className="border-signal/40 text-signal">
            {content.badge}
          </Badge>
        </Reveal>
        <Reveal>
          <StatCounter
            value={content.stat}
            className="font-display block text-7xl font-medium tracking-[-0.02em] text-signal md:text-9xl"
          />
        </Reveal>
        <Reveal>
          <p data-reveal-item className="max-w-xl text-balance text-lg leading-relaxed text-ink/80 md:text-xl">
            {content.paragraph}
          </p>
        </Reveal>

        <div className="mt-6 grid w-full grid-cols-1 gap-6 sm:grid-cols-3 lg:gap-8">
          {content.points.map((point, i) => (
            <Reveal key={i} className="rounded-2xl bg-paper p-8 text-left md:p-10">
              <p data-reveal-item className="text-xs font-medium uppercase tracking-[0.08em] text-signal">
                {point.label}
              </p>
              <p data-reveal-item className="mt-2 text-base leading-relaxed text-ink/80">
                {point.value}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
