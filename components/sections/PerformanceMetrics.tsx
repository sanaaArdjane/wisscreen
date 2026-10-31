import type { Service } from "@/lib/types";
import type { SectionContent } from "@/lib/content/schema";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { StatCounter } from "@/components/ui/StatCounter";
import { cn } from "@/lib/cn";
import Link from "next/link";

export function PerformanceMetrics({
  content,
  solutions,
}: {
  content: SectionContent<"performance">;
  solutions: Service[];
}) {
  return (
    <section id="performance" className="section-paper texture-3d py-24 text-ink md:py-32 lg:py-40">

      <Container className="relative flex flex-col gap-16">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          description={content.heading.description || undefined}
        />

        {/* Opaque tiles over the texture, so every numeral sits on a flat fill. One
            mint tile is the accent; the rest are mist. */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {solutions.map((service, i) => (
            <Reveal key={service.slug} className={cn("rounded-2xl p-8", i === 1 ? "bg-mint" : "bg-mist")}>
              <Link href={`/solutions/${service.slug}`} className="flex h-full flex-col justify-between gap-8" data-reveal-item>
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-signal">{service.name}</p>
                <div className="flex flex-col gap-6">
                  {service.stats.slice(0, 2).map((stat) => (
                    <div key={stat.label}>
                      <StatCounter value={stat.value} className="font-display block text-4xl font-medium text-ink" />
                      <p className="mt-1 text-sm leading-snug text-ink/80">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
