import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/types";

const VALUES: { icon: IconName; title: string; text: string }[] = [
  { icon: "lock", title: "Sécurité & confidentialité", text: "La protection des données de nos partenaires et de leurs clients guide chacune de nos décisions produit." },
  { icon: "sparkles", title: "Innovation continue", text: "Notre équipe Data et Ingénierie fait évoluer nos solutions en continu, au rythme des besoins du marché." },
  { icon: "users", title: "Accessibilité", text: "Des interfaces pensées pour être utilisables par des équipes non techniques, sans compromis sur la puissance." },
];

export function Values() {
  return (
    <section id="values" className="bg-paper py-28 text-ink">
      <Container className="flex flex-col gap-16">
        <SectionHeading eyebrow="Nos valeurs" title="Ce qui guide Wissal Univers." align="center" />

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {VALUES.map((value) => (
            <Reveal key={value.title} className="flex flex-col items-center gap-4 text-center">
              <span data-reveal-item className="flex h-14 w-14 items-center justify-center rounded-full bg-teal/15 text-teal-deep">
                <Icon name={value.icon} className="h-6 w-6" />
              </span>
              <p data-reveal-item className="text-lg font-semibold">{value.title}</p>
              <p data-reveal-item className="max-w-xs text-sm leading-relaxed opacity-70">{value.text}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
