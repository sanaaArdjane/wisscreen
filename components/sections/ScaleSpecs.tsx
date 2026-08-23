import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/types";

const SPECS: { icon: IconName; value: string; label: string }[] = [
  { icon: "globe", value: "100%", label: "Données hébergées en environnement souverain, sous votre contrôle." },
  { icon: "clock", value: "24/7", label: "Supervision continue de l'infrastructure par notre équipe technique." },
  { icon: "lock", value: "AES-256", label: "Chiffrement des données au repos et en transit sur toutes nos solutions." },
  { icon: "link", value: "REST API", label: "Chaque solution s'intègre à vos systèmes existants via des API documentées." },
  { icon: "server", value: "Multi-région", label: "Une infrastructure pensée pour évoluer avec vos volumes, sans interruption." },
  { icon: "refresh", value: "Sauvegardes", label: "Politiques de sauvegarde et de reprise après sinistre configurables." },
];

export function ScaleSpecs() {
  return (
    <section className="section-ink py-28">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="Infrastructure"
          title="Construites pour l'échelle, dès le premier jour."
          align="center"
          description="Chaque solution Wissal Univers hérite des standards de sécurité et de disponibilité de WICLOUD."
        />

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
          {SPECS.map((spec) => (
            <Reveal key={spec.label} className="flex flex-col gap-4 bg-ink p-8">
              <span data-reveal-item className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-aqua">
                <Icon name={spec.icon} className="h-5 w-5" />
              </span>
              <p data-reveal-item className="font-display text-2xl font-semibold">{spec.value}</p>
              <p data-reveal-item className="text-sm leading-relaxed opacity-65">{spec.label}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
