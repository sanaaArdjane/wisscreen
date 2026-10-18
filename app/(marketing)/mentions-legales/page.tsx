import type { Metadata } from "next";
import { getSiteContent } from "@/lib/content";
import { getCompany } from "@/lib/settings";
import { resolveSeo } from "@/lib/seo/metadata";
import { breadcrumbTrail } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL } from "@/lib/site";
import { LegalPage, Section, Facts } from "@/components/sections/legal/LegalPage";

/**
 * Mandatory in France, and a trust signal everywhere — including for an assistant
 * deciding whether this company is real enough to name.
 *
 * Every fact comes from the identity edited in /admin/paramètres, the same one the
 * devis and factures print, so the legal page and the invoices can never disagree.
 * A field left empty is simply absent here rather than rendered as a blank label.
 */
export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const { general } = await getSiteContent();
  const { title, description, canonical, robots } = resolveSeo({
    fallbackTitle: "Mentions légales",
    fallbackDescription:
      "Éditeur du site, hébergement, propriété intellectuelle et coordonnées légales de WICLOUD.",
    path: "/mentions-legales",
    siteNoindex: general.noindex,
  });
  return { title, description, alternates: { canonical }, ...(robots ? { robots } : {}) };
}

export default async function LegalNoticePage() {
  const [{ general }, company] = await Promise.all([getSiteContent(), getCompany()]);
  const name = company.name || general.siteName || "WICLOUD";

  return (
    <>
      <JsonLd
        data={breadcrumbTrail([
          { name: "Accueil", path: "" },
          { name: "Mentions légales", path: "/mentions-legales" },
        ])}
      />
      <LegalPage title="Mentions légales" intro={`Informations légales relatives au site ${SITE_URL}.`}>
        <Section title="Éditeur du site">
          <Facts
            rows={[
              ["Dénomination", name],
              ["Forme juridique", company.legalForm],
              ["Capital social", company.capital],
              ["Adresse", [company.address, company.city, company.country].filter(Boolean).join(", ")],
              ["Registre du commerce (RC)", company.rc],
              ["NIF", company.nif],
              ["NIS", company.nis],
              ["Article d'imposition", company.ai],
              ["Téléphone", company.phone || general.contact.phone],
              ["Courriel", company.email || general.contact.email],
            ]}
          />
        </Section>

        <Section title="Directeur de la publication">
          <p>{company.signatoryName ? `${company.signatoryName}${company.signatoryTitle ? `, ${company.signatoryTitle}` : ""}.` : `Le représentant légal de ${name}.`}</p>
        </Section>

        <Section title="Hébergement">
          <p>
            Le site est hébergé sur une infrastructure opérée par {name}. Les données applicatives sont
            stockées sur Neon (PostgreSQL géré) et les fichiers téléversés dans un stockage objet privé,
            accessibles uniquement par liens signés à durée limitée.
          </p>
        </Section>

        <Section title="Propriété intellectuelle">
          <p>
            L&apos;ensemble des contenus de ce site — textes, visuels, logiciels et marques — est la
            propriété de {name} ou de ses partenaires. Toute reproduction ou réutilisation, totale ou
            partielle, sans autorisation écrite préalable est interdite.
          </p>
        </Section>

        <Section title="Responsabilité">
          <p>
            {name} s&apos;efforce de tenir les informations de ce site à jour, sans garantir leur
            exhaustivité. Les liens vers des sites tiers n&apos;engagent pas la responsabilité de {name}
            quant à leur contenu.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Pour toute question relative à ces mentions, écrivez-nous à l&apos;adresse ci-dessus ou via{" "}
            <a href="/contact" className="text-accent underline underline-offset-4">
              le formulaire de contact
            </a>
            .
          </p>
        </Section>
      </LegalPage>
    </>
  );
}
