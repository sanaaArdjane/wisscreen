import { getServiceBySlug } from "@/lib/data/services";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { MediaSlot } from "@/components/ui/MediaSlot";

const PANELS = [
  { slug: "wifacility", title: "Etaysir — panneau bancaire", text: "Les banques pilotent l'intégralité du cycle de financement : scoring, validation, échéanciers, recouvrement." },
  { slug: "setycore", title: "Dashboard marchand SETYCORE", text: "Catalogue, commandes, paiements et statistiques de vente, centralisés dans un seul back-office." },
  { slug: "wicloud", title: "Console WICLOUD", text: "Calcul, stockage et supervision de l'infrastructure, pilotés depuis une interface unique." },
];

export function PlatformShowcase() {
  return (
    <section className="bg-paper py-28 text-ink">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="La plateforme"
          title="Un tableau de bord pensé pour chaque métier."
          description="Derrière chaque solution Wissal Univers se cache une interface d'administration claire, pensée pour les équipes qui l'utilisent au quotidien."
          align="center"
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {PANELS.map((panel) => {
            const service = getServiceBySlug(panel.slug);
            if (!service) return null;
            return (
              <Reveal key={panel.slug} className="flex flex-col gap-5">
                <div data-reveal-item>
                  <MediaSlot slot={service.media.hero} accent={service.palette.primary} />
                </div>
                <div data-reveal-item>
                  <p className="text-lg font-semibold">{panel.title}</p>
                  <p className="mt-2 text-sm leading-relaxed opacity-70">{panel.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
