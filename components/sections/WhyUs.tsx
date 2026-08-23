import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Accordion } from "@/components/ui/Accordion";

const BENEFITS = [
  { title: "Support dédié", content: "Une équipe support réactive, disponible pour vos équipes techniques comme métier." },
  { title: "SLA garanti", content: "Des engagements de disponibilité et de temps de réponse formalisés contractuellement." },
  { title: "Formation des équipes", content: "Vos équipes sont formées à l'utilisation des tableaux de bord, API et bonnes pratiques." },
  { title: "Intégration sur-mesure", content: "Chaque intégration est adaptée à vos systèmes existants, pas l'inverse." },
  { title: "Accompagnement Etaysir", content: "Un accompagnement dédié pour les banques lors de la mise en place du panneau Etaysir." },
  { title: "Roadmap partagée", content: "Nous partageons régulièrement notre feuille de route produit avec nos partenaires." },
];

export function WhyUs() {
  return (
    <section className="section-ink py-28">
      <Container className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SectionHeading
          eyebrow="Pourquoi Wissal Univers"
          title="Un partenaire technique, pas juste un fournisseur."
          description="Au-delà du produit, c'est un accompagnement dans la durée que nous proposons à chaque banque, partenaire et particulier."
        />
        <Accordion items={BENEFITS.map((benefit) => ({ title: benefit.title, content: benefit.content }))} />
      </Container>
    </section>
  );
}
