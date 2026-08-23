import { getServiceBySlug } from "@/lib/data/services";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

const POINTS = [
  { icon: "scan" as const, title: "Compréhension de documents", text: "Nos modèles ne lisent pas que du texte : ils comprennent la structure d'un document — champs, tableaux, signatures." },
  { icon: "refresh" as const, title: "Apprentissage continu", text: "L'équipe Data ré-entraîne les modèles en continu sur de nouveaux types de documents et de nouvelles langues." },
  { icon: "shield" as const, title: "Traitement maîtrisé", text: "Vos documents sont traités dans un environnement que vous contrôlez, hébergé sur notre infrastructure WICLOUD." },
];

export function DataIntelligence() {
  const ocr = getServiceBySlug("ocr");

  return (
    <section className="bg-paper py-28 text-ink">
      <Container className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <Reveal className="order-2 flex flex-col gap-8 lg:order-1">
          <div data-reveal-item>
            <SectionHeading
              eyebrow="Data & Intelligence"
              title="L'intelligence artificielle, conçue en interne."
              description="Notre équipe Data développe, entraîne et fait évoluer les modèles qui font tourner OCR — sans dépendre de fournisseurs externes pour comprendre vos documents les plus sensibles."
            />
          </div>
          <div className="flex flex-col gap-6">
            {POINTS.map((point) => (
              <div key={point.title} data-reveal-item className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ink/5 text-teal-deep">
                  <Icon name={point.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold">{point.title}</p>
                  <p className="mt-1 text-sm leading-relaxed opacity-70">{point.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div data-reveal-item>
            <Button href="/solutions/ocr" variant="secondary">
              Découvrir OCR
            </Button>
          </div>
        </Reveal>

        <Reveal className="order-1 lg:order-2">
          <div data-reveal-item>
            {ocr && <MediaSlot slot={ocr.media.hero} accent={ocr.palette.primary} />}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
