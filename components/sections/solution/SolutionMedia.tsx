import type { Service } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { paletteText } from "@/lib/palette";

export function SolutionMedia({ service }: { service: Service }) {
  return (
    <section id="media" className="section-ink py-28">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="Images, vidéos & démo"
          title={`Découvrez ${service.name} en images.`}
          description="Les visuels ci-dessous sont des aperçus provisoires — captures d'écran et vidéo réelles à venir."
        />

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {service.media.gallery.map((slot) => (
            <Reveal key={slot.label}>
              <div data-reveal-item>
                <MediaSlot slot={slot} accent={service.palette.primary} />
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="flex flex-col items-start gap-6 rounded-3xl border border-white/10 p-8 md:flex-row md:items-center md:justify-between">
          <div data-reveal-item className="flex items-start gap-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 ${paletteText[service.palette.primary]}`}>
              <Icon name="zap" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-lg font-semibold">Environnement de démonstration</p>
              <p className="mt-1 max-w-xl text-sm leading-relaxed opacity-65">
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
