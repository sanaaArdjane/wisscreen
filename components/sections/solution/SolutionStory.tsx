import type { Service } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { StatCounter } from "@/components/ui/StatCounter";

export function SolutionStory({ service }: { service: Service }) {
  return (
    <section className="bg-paper py-28 text-ink">
      <Container className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.7fr)]">
        <div className="flex flex-col gap-10">
          <SectionHeading eyebrow="Présentation" title={`${service.name}, en détail`} />
          <Reveal className="flex flex-col gap-6">
            {service.description.map((paragraph) => (
              <p key={paragraph} data-reveal-item className="text-lg leading-relaxed opacity-75">
                {paragraph}
              </p>
            ))}
          </Reveal>
        </div>

        <Reveal className="flex flex-col gap-8 self-start rounded-3xl border border-ink/10 p-8">
          {service.stats.map((stat) => (
            <div key={stat.label} data-reveal-item>
              <StatCounter value={stat.value} className="font-display block text-4xl font-semibold" />
              <p className="mt-1 text-sm leading-snug opacity-60">{stat.label}</p>
            </div>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
