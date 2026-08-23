import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/types";

const PILLARS: { icon: IconName; title: string; text: string }[] = [
  { icon: "lock", title: "Chiffrement de bout en bout", text: "Les données sont chiffrées au repos et en transit sur l'ensemble des solutions Wissal Univers." },
  { icon: "shield", title: "Contrôle d'accès strict", text: "Rôles, permissions et journaux d'audit pour savoir qui accède à quoi, à tout moment." },
  { icon: "check", title: "Traçabilité & conformité", text: "Chaque action sensible — validation d'un dossier, traitement d'un document — est tracée et auditable." },
];

export function Security() {
  return (
    <section className="bg-paper py-28 text-ink">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="Sécurité & conformité"
          title="La confiance ne se négocie pas."
          align="center"
          description="Nos solutions traitent des données sensibles — identité, finances, transactions. La sécurité est pensée dès la conception, pas ajoutée après coup."
        />

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {PILLARS.map((pillar) => (
            <Reveal key={pillar.title} className="flex flex-col items-center gap-4 text-center">
              <span data-reveal-item className="flex h-14 w-14 items-center justify-center rounded-2xl bg-ink text-paper">
                <Icon name={pillar.icon} className="h-6 w-6" />
              </span>
              <p data-reveal-item className="text-lg font-semibold">{pillar.title}</p>
              <p data-reveal-item className="max-w-xs text-sm leading-relaxed opacity-70">{pillar.text}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
