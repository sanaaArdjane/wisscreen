import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";

const LINKS = [
  {
    from: "OCR",
    to: "WIFACILITY",
    text: "Les pièces justificatives d'un dossier de financement sont lues et vérifiées automatiquement par OCR avant validation.",
  },
  {
    from: "WIFACILITY",
    to: "SETYCORE",
    text: "Le paiement échelonné de WIFACILITY est intégré nativement dans la marketplace SETYCORE au moment du paiement.",
  },
  {
    from: "WICLOUD",
    to: "Toutes les solutions",
    text: "OCR, WIFACILITY et SETYCORE fonctionnent tous sur l'infrastructure WICLOUD — un socle commun, sécurisé et supervisé.",
  },
];

export function ConnectedSolutions() {
  return (
    <section className="section-ink py-28">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          eyebrow="Un seul univers"
          title="Des solutions connectées entre elles."
          description="Wissal Univers n'est pas une collection d'outils isolés : chaque produit est pensé pour s'intégrer aux autres et créer un parcours continu, de la donnée jusqu'au paiement."
        />

        <div className="flex flex-col gap-6">
          {LINKS.map((link) => (
            <Reveal key={link.from + link.to} className="flex flex-col gap-4 rounded-3xl border border-white/10 p-6 md:flex-row md:items-center md:gap-8 md:p-8">
              <div data-reveal-item className="flex shrink-0 items-center gap-3">
                <Badge className="border-aqua/40 text-aqua">{link.from}</Badge>
                <Icon name="link" className="h-4 w-4 opacity-50" />
                <Badge className="border-teal/40 text-aqua">{link.to}</Badge>
              </div>
              <p data-reveal-item className="text-base leading-relaxed opacity-75">
                {link.text}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
