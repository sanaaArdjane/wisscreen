import { SERVICES } from "@/lib/data/services";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { StatCounter } from "@/components/ui/StatCounter";
import Link from "next/link";

export function PerformanceMetrics() {
  return (
    <section className="relative overflow-hidden bg-paper py-28 text-ink">
      {/* Textured paper rather than flat white. Two layers, both very low contrast:
          the same dot grid the dark sections use — inverted to ink dots on paper, so
          both grounds share one visual language — over a soft mist wash that keeps the
          section from reading as a blank sheet. Alpha lives in the colour rather than
          an `opacity-*` class so the grid can't be lightened twice. */}
      {/* Masked at the bottom: the section below is the same white, so an abrupt end to
          the dot grid becomes the only thing marking the boundary and reads as a stray
          line rather than a section change. Dissolving the grain first avoids that. The
          top needs no mask — it meets a dark section, where the colour change dominates. */}
      <div
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(53,70,102,0.13)_1px,transparent_0)] [background-size:22px_22px]"
        style={{
          maskImage: "linear-gradient(to bottom, black 0%, black 58%, transparent 96%)",
          WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 58%, transparent 96%)",
        }}
      />
      <div className="pointer-events-none absolute -left-40 top-0 h-[28rem] w-[52rem] rounded-[50%] bg-mist/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 h-[26rem] w-[46rem] rounded-[50%] bg-mist/60 blur-3xl" />

      {/* `relative`: the texture layers above are absolutely positioned, so a static
          sibling would render underneath them. */}
      <Container className="relative flex flex-col gap-16">
        <SectionHeading
          eyebrow="Performance & échelle"
          title="Conçues pour tenir la charge, à chaque étage."
          description="Du document scanné à la transaction bancaire validée, chaque solution est mesurée en continu — voici les chiffres qui comptent."
        />

        {/* The data tiles stay dark on the light ground: it keeps the numbers as the
            loudest thing in the section, and `.bg-ink` carries the dark-ground accent
            overrides so the tokens inside resolve correctly without touching them. */}
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl bg-ink/15 shadow-xl md:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <Reveal key={service.slug} className="bg-ink p-8 text-paper">
              <Link href={`/solutions/${service.slug}`} className="flex h-full flex-col justify-between gap-8" data-reveal-item>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-aqua">{service.name}</p>
                <div className="flex flex-col gap-6">
                  {service.stats.slice(0, 2).map((stat) => (
                    <div key={stat.label}>
                      <StatCounter value={stat.value} className="font-display block text-4xl font-semibold" />
                      <p className="mt-1 text-sm leading-snug text-paper/70">{stat.label}</p>
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
