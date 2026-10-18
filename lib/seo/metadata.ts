import type { SeoOverrides } from "@/lib/types";

/**
 * One fallback chain, resolved in one place.
 *
 * Every public page type — solutions, use-case pages, blog posts — offers the same
 * five overrides and falls back to its own editorial copy. Writing that `||` ladder
 * inline in each `generateMetadata` is how the three drift: one forgets the sitewide
 * brake, another sets `follow: false` and quietly orphans its internal links.
 *
 * It is a pure function on purpose. The branch that decides whether a page is
 * indexable is exactly the kind that silently does the wrong thing, so it earns a
 * test — see `__tests__/seo.test.ts`.
 */
export type ResolvedSeo = {
  title: string;
  description: string;
  /** Always a path. `metadataBase` absolutises it, and an absolute value stored here
   *  would survive a domain change pointing at the old one. */
  canonical: string;
  /** `null` when the page is indexable, so the caller can spread it or omit it. */
  robots: { index: false; follow: boolean } | null;
};

export function resolveSeo({
  seo,
  fallbackTitle,
  fallbackDescription,
  path,
  siteNoindex = false,
}: {
  seo?: Partial<SeoOverrides>;
  fallbackTitle: string;
  fallbackDescription: string;
  path: string;
  siteNoindex?: boolean;
}): ResolvedSeo {
  return {
    // `||`, never `??`: an empty string is what an owner leaves behind by clearing a
    // field, and it has to fall back exactly like an absent one would.
    title: seo?.title || fallbackTitle,
    description: seo?.description || fallbackDescription,
    canonical: seo?.canonical || path,
    /*
     * Two different kinds of hiding:
     *  - the sitewide brake takes everything out, links included — it is used when
     *    something must stop being public at once;
     *  - a per-page `noindex` keeps `follow: true`, because the page is still a part
     *    of the site's internal graph. Dropping `follow` there would strand every
     *    page this one links to.
     */
    robots: siteNoindex
      ? { index: false, follow: false }
      : seo?.noindex
        ? { index: false, follow: true }
        : null,
  };
}
