import { getServiceBySlug } from "@/lib/data/services";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";
import { StatCounter } from "@/components/ui/StatCounter";

const POINTS = [
  { label: "Supervision", value: "24/7 par notre équipe infrastructure" },
  { label: "Redondance", value: "Réplication multi-instances des services critiques" },
  { label: "Reprise après sinistre", value: "Sauvegardes automatisées et plans de restauration testés" },
];

export function Reliability() {
  const wicloud = getServiceBySlug("wicloud");
  const uptime = wicloud?.stats[0]?.value ?? "99,95%";

  return (
    <section className="section-ink relative overflow-hidden py-32">
      <div className="pointer-events-none absolute -left-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-aqua/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-teal/10 blur-3xl" />

      <Container className="relative flex flex-col items-center gap-10 text-center">
        <Reveal>
          <Badge data-reveal-item className="border-warm/40 text-warm">
            Fiabilité 24/7
          </Badge>
        </Reveal>
        <Reveal>
          <StatCounter
            value={uptime}
            className="font-display block text-7xl font-semibold md:text-9xl"
          />
        </Reveal>
        <Reveal>
          <p data-reveal-item className="max-w-xl text-balance text-lg leading-relaxed opacity-70 md:text-xl">
            de disponibilité garantie sur WICLOUD, l&apos;infrastructure qui fait tourner
            l&apos;ensemble des solutions Wissal Univers — surveillée en continu pour que vos
            équipes n&apos;aient jamais à s&apos;en inquiéter.
          </p>
        </Reveal>

        <div className="mt-6 grid w-full grid-cols-1 gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-3">
          {POINTS.map((point) => (
            <Reveal key={point.label} className="bg-ink p-6 text-left">
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
