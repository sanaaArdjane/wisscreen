import type { SiteContent } from "@/lib/content/schema";
import type { Service } from "@/lib/types";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/**
 * The structured data the public pages emit.
 *
 * **This file imports no database.** The editable copy arrives as a parameter — the
 * `general` block the caller already fetched — so these stay pure functions: unit
 * testable, importable anywhere, and impossible to turn into a second query per page
 * by accident.
 *
 * `SITE_NAME` / `SITE_URL` remain the fallback when a field is empty. The origin in
 * particular is deliberately *not* editable: a typo in `/admin/site` would break every
 * canonical URL at once, and the fix would live behind a login served from the broken
 * domain.
 */
type General = SiteContent["general"];

/**
 * One stable identifier for the company, referenced by everything else.
 *
 * Without it, each page asserts its own freestanding `Organization` and a search
 * engine has no reason to believe they are the same company — which is the difference
 * between one entity that accumulates authority and three that each start from
 * nothing. `provider`, `publisher` and so on point here with `@id` instead of
 * re-describing the org inline.
 */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

const filled = (value: string | undefined | null): value is string =>
  typeof value === "string" && value.trim().length > 0;

/** Sitewide entity, rendered once in the root layout so it's on every page. */
export function organizationSchema(general: General) {
  const { contact, socials } = general;

  /* `sameAs` is how a search engine ties this site to the company's profiles
     elsewhere, and it is the cheapest corroboration signal there is — the social
     links were already editable and already rendered in the footer; they simply never
     reached the markup. */
  const sameAs = Object.values(socials).filter(filled);

  /* Only claim a contact point if there is something to contact. An empty
     `ContactPoint` is markup asserting nothing, which is worse than its absence. */
  const contactPoint =
    filled(contact.email) || filled(contact.phone)
      ? {
          "@type": "ContactPoint",
          contactType: "sales",
          ...(filled(contact.email) ? { email: contact.email } : {}),
          ...(filled(contact.phone) ? { telephone: contact.phone } : {}),
          availableLanguage: ["fr"],
          areaServed: ["DZ", "FR"],
        }
      : undefined;

  /* The address is one free-text line today, so it is emitted as `streetAddress`
     rather than invented into locality/postal code fields. Splitting it is what would
     move the needle on local results — see docs/SEO.md. */
  const address = filled(contact.address)
    ? { "@type": "PostalAddress", streetAddress: contact.address, addressCountry: "DZ" }
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: general.siteName || SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon`,
    ...(filled(general.seoDescription) ? { description: general.seoDescription } : {}),
    areaServed: ["DZ", "FR"],
    ...(sameAs.length ? { sameAs } : {}),
    ...(contactPoint ? { contactPoint } : {}),
    ...(address ? { address } : {}),
  };
}

/** Homepage-only — names the site itself as an entity distinct from the org. */
export function websiteSchema(general: General) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: general.siteName || SITE_NAME,
    url: SITE_URL,
    inLanguage: "fr",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/** Home → Solutions → this solution, for breadcrumb rich results. */
export function breadcrumbSchema(service: Service) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Solutions",
        item: `${SITE_URL}/#solutions`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: service.name,
        item: `${SITE_URL}/solutions/${service.slug}`,
      },
    ],
  };
}

/** Describes the solution itself as a `Service` entity offered by the org. */
export function serviceSchema(service: Service) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.heroDescription,
    serviceType: service.category,
    url: `${SITE_URL}/solutions/${service.slug}`,
    areaServed: ["DZ", "FR"],
    provider: { "@id": ORGANIZATION_ID },
  };
}

/**
 * Turns real on-page Q&A into an FAQ rich result, at no extra content cost.
 *
 * Takes the questions rather than a `Service` so the homepage's own FAQ section can
 * use it too — it ships the same shape of copy and was the one place emitting none.
 */
export function faqSchema(faq: { question: string; answer: string }[]) {
  if (faq.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
