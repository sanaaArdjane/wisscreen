import type { Service } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { paletteText } from "@/lib/palette";

export function SolutionMedia({ service }: { service: Service }) {
  /* The "provisional" line has to stop claiming that once real assets land, and each slot
     fills in independently — so it is keyed on whether *every* slot is still a mock. */
  const allPlaceholders = service.media.gallery.every((slot) => !slot.src);

  return (
    <section id="media" className="section-paper py-24 text-ink md:py-32 lg:py-40">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="Images, vidéos & démo"
          title={`Découvrez ${service.name} en images.`}
          description={
            allPlaceholders
              ? "Les visuels ci-dessous sont des aperçus provisoires — captures d'écran et vidéo réelles à venir."
              : `Captures d'écran et séquences de ${service.name}, en conditions réelles.`
          }
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {service.media.gallery.map((slot) => (
            <Reveal key={slot.label}>
              <div data-reveal-item>
                <MediaSlot slot={slot} accent={service.palette.primary} />
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="flex flex-col items-start gap-6 rounded-2xl bg-mist p-8 md:flex-row md:p-10 md:items-center md:justify-between">
          <div data-reveal-item className="flex items-start gap-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-paper ${paletteText[service.palette.primary]}`}>
              <Icon name="zap" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-medium">Environnement de démonstration</p>
              <p className="mt-1 max-w-xl text-base leading-relaxed text-ink/80">
                Un accès à un environnement de démonstration de {service.name} peut être fourni sur demande à nos
                partenaires et prospects qualifiés.
              </p>
            </div>
          </div>
          <div data-reveal-item>
            <Button href="#contact" variant="primary">
              Demander l&apos;accès
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
