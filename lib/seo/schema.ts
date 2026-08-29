import type { Service } from "@/lib/types";
import { SITE_NAME, SITE_URL } from "@/lib/site";

/** Sitewide entity, rendered once in the root layout so it's on every page. */
export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon`,
  };
}

/** Homepage-only — names the site itself as an entity distinct from the org. */
export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
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
    provider: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

/** Every solution already ships real Q&A copy (`service.faq`) — this is what makes
 *  that content eligible for an FAQ rich result, at no extra content cost. */
export function faqSchema(service: Service) {
  if (service.faq.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: service.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
