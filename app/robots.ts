import type { MetadataRoute } from "next";
import { getSiteContent } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

/**
 * Paths no crawler should spend budget on.
 *
 * `/admin` and `/dashboard` already answer `noindex` from their layout, and both are
 * behind auth — but a crawler still has to fetch them to find that out, and every one
 * of those fetches is a redirect to `/connexion`. The auth pages themselves are now
 * `noindex` too (see `app/(auth)/layout.tsx`); listing them here as well stops the
 * crawl before the request rather than after it.
 *
 * **`/media` is deliberately absent.** It serves the public site's own images and
 * videos out of the private bucket — the only attachments it will stream are the ones
 * flagged `public` — so blocking it would hide the site's imagery from Google Images
 * for no benefit. (The plan called for disallowing it; reading the route showed that
 * was wrong.)
 */
const PRIVATE_PATHS = [
  "/admin/",
  "/dashboard/",
  "/api/",
  "/connexion",
  "/inscription",
  "/mot-de-passe-oublie",
  "/reinitialiser",
  "/verification",
  "/acces-refuse",
  "/compte-suspendu",
];

/**
 * Crawlers that fetch a page **to quote it in an answer**.
 *
 * These are the ones that matter for being recommended by ChatGPT, Claude and
 * Perplexity, and they are listed explicitly rather than left to the `*` group so the
 * intent is legible: WICLOUD wants to be citable. `Bingbot` is in the list for the
 * same reason — Bing's index is what ChatGPT's search reaches for.
 *
 * Note the robots.txt rule that makes this file look repetitive: a crawler that finds
 * a group matching its own name **ignores the `*` group entirely**. So every group
 * below has to restate the disallow list, or naming a bot would accidentally grant it
 * the whole dashboard.
 */
const ANSWER_ENGINE_CRAWLERS = ["OAI-SearchBot", "ClaudeBot", "PerplexityBot", "Bingbot"];

/**
 * Crawlers that collect pages **to train models on**.
 *
 * Kept as its own list because it is a different decision from the one above, and one
 * for the business rather than for this file: allowing citation does not oblige you to
 * allow training, and the two are controlled by different user-agents. They are
 * currently allowed — same terms as everyone else — which is the deliberate choice.
 * To opt out of training while staying citable, move these to `disallow: "/"`; nothing
 * about the answer-engine group above changes.
 */
const TRAINING_CRAWLERS = ["GPTBot", "Google-Extended", "CCBot", "anthropic-ai"];

/** Reads editable content, so it cannot be left frozen on the build. Same reasoning as
 *  `app/manifest.ts`: a file-convention route has no cache tag for `updateTag` to hit. */
export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const { general } = await getSiteContent();

  /* The sitewide brake. A `noindex` meta tag asks politely for removal next crawl;
     this stops the crawl outright. Both are needed, and both come from the same
     switch in /admin/site. */
  if (general.noindex) {
    return { rules: { userAgent: "*", disallow: "/" }, host: SITE_URL };
  }

  const allowPublic = (userAgent: string | string[]) => ({
    userAgent,
    allow: "/",
    disallow: PRIVATE_PATHS,
  });

  return {
    rules: [
      allowPublic("*"),
      allowPublic(ANSWER_ENGINE_CRAWLERS),
      allowPublic(TRAINING_CRAWLERS),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
