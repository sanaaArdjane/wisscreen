import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";

const PROFILES = [
  {
    title: "Vous êtes une banque",
    text: "Automatisez l'évaluation et le suivi des dossiers de financement grâce à Etaysir, avec une vérification d'identité fiabilisée par OCR.",
    solutions: [
      { name: "WIFACILITY / Etaysir", slug: "wifacility" },
      { name: "OCR", slug: "ocr" },
    ],
  },
  {
    title: "Vous êtes un commerçant partenaire",
    text: "Vendez au comptant ou en paiement échelonné sur votre propre marketplace, avec un dashboard unifié pour tout piloter.",
    solutions: [
      { name: "SETYCORE", slug: "setycore" },
      { name: "WIFACILITY", slug: "wifacility" },
    ],
  },
  {
    title: "Vous êtes un particulier",
    text: "Achetez au comptant ou en plusieurs fois sur SETYCORE, avec un parcours simple et transparent.",
    solutions: [{ name: "SETYCORE", slug: "setycore" }],
  },
  {
    title: "Vous développez une plateforme",
    text: "Hébergez et faites évoluer vos applications sur WICLOUD, l'infrastructure qui fait tourner tout Wissal Univers.",
    solutions: [{ name: "WICLOUD", slug: "wicloud" }],
  },
];

export function SolutionFinder() {
  return (
    <section className="section-ink py-28">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="Quelle solution pour vous ?"
          title="Trouvez le produit adapté à votre situation."
          description="Selon votre profil, une ou plusieurs solutions Wissal Univers répondent directement à votre besoin."
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {PROFILES.map((profile) => (
            <Reveal key={profile.title} className="flex flex-col gap-5 rounded-3xl border border-white/10 p-8">
              <p data-reveal-item className="text-xl font-semibold">{profile.title}</p>
              <p data-reveal-item className="text-sm leading-relaxed opacity-70">{profile.text}</p>
              <div data-reveal-item className="mt-auto flex flex-wrap gap-3 pt-2">
                {profile.solutions.map((solution) => (
                  <Link key={solution.slug} href={`/solutions/${solution.slug}`}>
                    <Badge className="border-teal/40 text-aqua transition-colors hover:bg-aqua hover:text-ink">
                      {solution.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
