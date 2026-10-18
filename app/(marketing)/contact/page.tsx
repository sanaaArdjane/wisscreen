import type { Metadata } from "next";
import { getSiteContent, getSolutions } from "@/lib/content";
import { getCompany } from "@/lib/settings";
import { resolveSeo } from "@/lib/seo/metadata";
import { breadcrumbTrail } from "@/lib/seo/schema";
import { JsonLd } from "@/components/seo/JsonLd";
import { Contact } from "@/components/sections/Contact";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";

/**
 * The contact section of the homepage, given its own address.
 *
 * It is the same component and the same editable copy — the page exists because
 * "contact" is a query people type, a link other sites give, and a fact a search
 * engine (or an assistant) wants to find at a stable URL rather than behind an anchor.
 */
export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const { general } = await getSiteContent();
  const { title, description, canonical, robots } = resolveSeo({
    fallbackTitle: "Nous contacter",
    fallbackDescription:
      "Parlez de votre projet à WICLOUD : infrastructure cloud, extraction de données, paiement et commerce en ligne, en Algérie et en France.",
    path: "/contact",
    siteNoindex: general.noindex,
  });
  return {
    title,
    description,
    alternates: { canonical },
    ...(robots ? { robots } : {}),
    openGraph: { type: "website", url: canonical, title, description },
  };
}

export default async function ContactPage() {
  const [{ general, sections }, solutions, company] = await Promise.all([
    getSiteContent(),
    getSolutions(),
    getCompany(),
  ]);
  const address = [company.address, company.city, company.country].filter(Boolean).join(", ");

  return (
    <main id="contenu" className="flex flex-1 flex-col pt-20">
      <JsonLd
        data={breadcrumbTrail([
          { name: "Accueil", path: "" },
          { name: "Nous contacter", path: "/contact" },
        ])}
      />
      <Contact content={sections.contact} contact={general.contact} solutions={solutions} />

      {address && (
        <section className="bg-mist py-16">
          <Container className="flex max-w-[48rem] items-start gap-3 text-sm text-ink/80">
            <Icon name="globe" className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <p>
              <span className="font-[650] text-ink">{company.name}</span>
              <br />
              {address}
            </p>
          </Container>
        </section>
      )}
    </main>
  );
}
