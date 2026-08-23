import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/types";

const INTEGRATIONS: { icon: IconName; title: string; text: string }[] = [
  { icon: "link", title: "API REST", text: "Chaque solution expose une API documentée pour s'intégrer à vos systèmes existants." },
  { icon: "layers", title: "SDKs", text: "Des kits de développement pour accélérer l'intégration côté mobile et web." },
  { icon: "zap", title: "Webhooks", text: "Recevez des événements en temps réel : dossier validé, paiement reçu, document traité." },
  { icon: "server", title: "Connecteurs bancaires", text: "Etaysir se connecte aux systèmes cœur des banques partenaires." },
  { icon: "store", title: "Connecteurs e-commerce", text: "SETYCORE s'intègre aux catalogues et outils de gestion existants des marchands." },
  { icon: "lock", title: "Authentification & SSO", text: "Gestion des accès sécurisée, compatible avec les standards d'authentification d'entreprise." },
];

export function Integrations() {
  return (
    <section id="integrations" className="section-ink py-28">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="Intégrations & API"
          title="Vos systèmes, connectés en toute simplicité."
          description="Wissal Univers se branche à votre écosystème existant — pas l'inverse."
        />

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {INTEGRATIONS.map((item) => (
            <Reveal key={item.title} className="flex flex-col gap-4 rounded-3xl border border-white/10 p-7">
              <span data-reveal-item className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-aqua">
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              <p data-reveal-item className="text-lg font-semibold">{item.title}</p>
              <p data-reveal-item className="text-sm leading-relaxed opacity-65">{item.text}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
