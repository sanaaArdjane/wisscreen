import type { Metadata } from "next";
import { getSiteContent } from "@/lib/content";
import { getCompany } from "@/lib/settings";
import { resolveSeo } from "@/lib/seo/metadata";
import { breadcrumbTrail } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { LegalPage, Section } from "@/components/sections/legal/LegalPage";

/**
 * What the platform actually does with personal data — written from the code, not from
 * a template: the account model, the private bucket with signed reads, the encrypted
 * demo secrets, the absence of third-party analytics. A privacy policy that describes
 * a different product is worse than none, because it is checkable.
 */
export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const { general } = await getSiteContent();
  const { title, description, canonical, robots } = resolveSeo({
    fallbackTitle: "Politique de confidentialité",
    fallbackDescription:
      "Quelles données WICLOUD collecte, pourquoi, combien de temps elles sont conservées et comment exercer vos droits.",
    path: "/politique-de-confidentialite",
    siteNoindex: general.noindex,
  });
  return { title, description, alternates: { canonical }, ...(robots ? { robots } : {}) };
}

export default async function PrivacyPage() {
  const [{ general }, company] = await Promise.all([getSiteContent(), getCompany()]);
  const name = company.name || general.siteName || "WICLOUD";
  const email = company.email || general.contact.email;

  return (
    <>
      <JsonLd
        data={breadcrumbTrail([
          { name: "Accueil", path: "" },
          { name: "Politique de confidentialité", path: "/politique-de-confidentialite" },
        ])}
      />
      <LegalPage
        title="Politique de confidentialité"
        intro={`Comment ${name} traite les données personnelles de ses visiteurs et de ses clients.`}
      >
        <Section title="Qui est responsable du traitement">
          <p>
            {name}, éditeur de ce site et de l&apos;espace client associé. Ses coordonnées figurent dans
            les{" "}
            <a href="/mentions-legales" className="text-accent underline underline-offset-4">
              mentions légales
            </a>
            .
          </p>
        </Section>

        <Section title="Ce que nous collectons, et pourquoi">
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              <strong className="font-[650] text-ink">Formulaire de contact</strong> — nom, adresse
              électronique, solution concernée et message. Uniquement pour vous répondre.
            </li>
            <li>
              <strong className="font-[650] text-ink">Compte client</strong> — nom, adresse
              électronique et, le cas échéant, société et téléphone. Nécessaires pour vous
              authentifier, suivre vos demandes, vos devis et vos factures.
            </li>
            <li>
              <strong className="font-[650] text-ink">Documents que vous déposez</strong> — pièces
              jointes à une demande ou à une démonstration. Conservées pour traiter votre dossier.
            </li>
            <li>
              <strong className="font-[650] text-ink">Journal d&apos;activité</strong> — les actions
              effectuées dans l&apos;espace client et le back-office, à des fins de traçabilité et de
              sécurité.
            </li>
          </ul>
          <p>
            Nous ne vendons aucune donnée, ne les transmettons à aucun courtier publicitaire, et
            n&apos;effectuons aucun profilage.
          </p>
        </Section>

        <Section title="Cookies et mesure d'audience">
          <p>
            Le site public ne dépose <strong className="font-[650] text-ink">aucun cookie
            publicitaire</strong> et n&apos;embarque aucun traceur tiers. Un cookie de session,
            strictement nécessaire, est déposé uniquement lorsque vous vous connectez à votre espace
            client ; il disparaît à la déconnexion ou à son expiration. Si une mesure d&apos;audience
            est ajoutée, elle sera sans cookie et sans identifiant individuel.
          </p>
        </Section>

        <Section title="Où les données sont stockées">
          <p>
            Les données applicatives sont hébergées sur une base PostgreSQL gérée (Neon). Les fichiers
            que vous déposez sont placés dans un stockage objet <strong className="font-[650] text-ink">privé</strong> :
            chaque lecture passe par un lien signé de courte durée, de sorte qu&apos;une adresse
            partagée par mégarde cesse de fonctionner. Les identifiants confiés dans le cadre
            d&apos;une démonstration sont chiffrés (AES-256-GCM) et ne sont déchiffrés qu&apos;à
            l&apos;affichage, pour le destinataire autorisé.
          </p>
        </Section>

        <Section title="Combien de temps nous les conservons">
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>Messages du formulaire de contact : 3 ans à compter du dernier échange.</li>
            <li>Comptes clients et dossiers associés : pendant toute la relation commerciale.</li>
            <li>Pièces comptables (devis, factures) : 10 ans, comme l&apos;exige la loi.</li>
            <li>Journal d&apos;activité : 12 mois.</li>
          </ul>
        </Section>

        <Section title="Vos droits">
          <p>
            Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement,
            d&apos;opposition et de portabilité sur vos données. La plupart des informations de votre
            compte sont modifiables directement depuis « Mon profil ». Pour toute autre demande,
            écrivez-nous{email ? ` à ${email}` : " via le formulaire de contact"} ; nous répondons sous
            30 jours.
          </p>
        </Section>

        <Section title="Modifications">
          <p>
            Cette politique peut évoluer avec le service. Toute modification substantielle sera
            signalée sur cette page, et aux titulaires d&apos;un compte par notification.
          </p>
        </Section>
      </LegalPage>
    </>
  );
}
