import type { MetadataRoute } from "next";
import { getSitemapEntries } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

/**
 * Like `manifest.ts` and `robots.ts`, this is a route handler Next generates **once at
 * build** unless told otherwise. Without this `revalidate` the sitemap would freeze at
 * deploy time, so editing a solution in /admin/site would never reach it — and a
 * sitemap that lags the site is worse than no sitemap, because it actively reports
 * stale dates. An hour matches the content cache's own TTL.
 */
export const revalidate = 3600;

/**
 * Pages that have never been edited have no honest date of their own, so they inherit
 * the deploy's. Computed once per generation rather than per entry, so a sitemap built
 * in one pass doesn't hand out timestamps a few milliseconds apart and look like
 * everything changed independently.
 */
const BUILT_AT = new Date();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { home, solutions } = await getSitemapEntries();

  return [
    {
      url: SITE_URL,
      lastModified: home ?? BUILT_AT,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...solutions.map((solution) => ({
      url: `${SITE_URL}/solutions/${solution.slug}`,
      lastModified: solution.updatedAt ?? BUILT_AT,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
