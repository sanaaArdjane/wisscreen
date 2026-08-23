import type { Service } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { PaletteAura } from "@/components/sections/solution/PaletteAura";

export function SolutionHero({ service }: { service: Service }) {
  return (
    <section className="section-ink relative flex min-h-[90svh] flex-col justify-end overflow-hidden pt-32 pb-20">
      <PaletteAura primary={service.palette.primary} secondary={service.palette.secondary} />

      <Container className="relative z-10 flex flex-col gap-8">
        <Reveal className="flex flex-wrap items-center gap-3">
          <Badge data-reveal-item className="border-warm/40 text-warm">
            {service.category}
          </Badge>
          {service.audiences.map((audience) => (
            <Badge key={audience} data-reveal-item className="border-white/20 opacity-70">
              {audience}
            </Badge>
          ))}
        </Reveal>

        <Reveal>
          <h1 data-reveal-item className="font-display text-balance text-6xl font-semibold leading-[1.02] md:text-8xl">
            {service.name}
          </h1>
        </Reveal>

        <Reveal className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <p data-reveal-item className="max-w-2xl text-balance text-xl leading-relaxed opacity-80 md:text-2xl">
            {service.tagline}
          </p>
          <div data-reveal-item className="flex shrink-0 flex-wrap gap-4">
            <Button href="#contact" variant="primary">
              Demander une démo
            </Button>
            <Button href="#media" variant="ghost">
              Voir en action
            </Button>
          </div>
        </Reveal>

        <Reveal>
          <p data-reveal-item className="max-w-3xl text-base leading-relaxed opacity-60">
            {service.heroDescription}
          </p>
        </Reveal>

        <Reveal>
          <p data-reveal-item className="text-xs font-semibold uppercase tracking-[0.14em] opacity-40">
            {service.team}
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
