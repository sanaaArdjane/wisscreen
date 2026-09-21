import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";
import { StatCounter } from "@/components/ui/StatCounter";
import type { SectionContent } from "@/lib/content/schema";

export function Reliability({ content }: { content: SectionContent<"reliability"> }) {
  return (
    <section id="reliability" className="section-ink relative overflow-hidden py-32">
      <div className="pointer-events-none absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-aqua/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />

      <Container className="relative flex flex-col items-center gap-10 text-center">
        <Reveal>
          <Badge data-reveal-item className="border-signal/40 text-signal">
            {content.badge}
          </Badge>
        </Reveal>
        <Reveal>
          <StatCounter
            value={content.stat}
            className="font-display block text-7xl font-semibold md:text-9xl"
          />
        </Reveal>
        <Reveal>
          <p data-reveal-item className="max-w-xl text-balance text-lg leading-relaxed opacity-70 md:text-xl">
            {content.paragraph}
          </p>
        </Reveal>

        <div className="mt-6 grid w-full grid-cols-1 gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-3">
          {content.points.map((point, i) => (
            <Reveal key={i} className="bg-ink p-6 text-left">
              <p data-reveal-item className="text-xs font-semibold uppercase tracking-[0.14em] text-aqua">
                {point.label}
              </p>
              <p data-reveal-item className="mt-2 text-sm leading-relaxed opacity-70">
                {point.value}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
