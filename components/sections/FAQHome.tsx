import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Accordion } from "@/components/ui/Accordion";

const FAQ = [
  {
    title: "Comment choisir la bonne solution pour mon activité ?",
    content: "Cela dépend de votre profil : banque, commerçant partenaire ou particulier. Consultez la section « Quelle solution pour vous ? » ou contactez-nous directement.",
  },
  {
    title: "Les solutions Wissal Univers sont-elles connectées entre elles ?",
    content: "Oui. OCR, WICLOUD, WIFACILITY et SETYCORE sont conçues pour fonctionner ensemble, sur une infrastructure commune.",
  },
  {
    title: "Proposez-vous un accompagnement à l'intégration ?",
    content: "Oui, chaque projet bénéficie d'un accompagnement dédié : audit, plan de migration, déploiement et formation des équipes.",
  },
  {
    title: "Où sont hébergées les données ?",
    content: "Sur WICLOUD, notre infrastructure cloud souveraine, avec un contrôle total sur la localisation des données.",
  },
  {
    title: "Comment devenir partenaire de Wissal Univers ?",
    content: "Contactez notre équipe via le formulaire ci-dessous — nous reviendrons vers vous rapidement pour étudier votre projet.",
  },
];

export function FAQHome() {
  return (
    <section id="faq" className="section-ink py-28">
      <Container className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SectionHeading eyebrow="Questions fréquentes" title="Tout ce que vous devez savoir." />
        <Accordion items={FAQ} />
      </Container>
    </section>
  );
}
