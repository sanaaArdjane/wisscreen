import type { MetadataRoute } from "next";
import { getSiteContent } from "@/lib/content";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

/**
 * The manifest used to read the hardcoded constants while the same two values were
 * editable in /admin/site and already driving every `<title>` — so renaming the site
 * renamed it everywhere except the install prompt.
 *
 * **`revalidate` is what makes reading editable content here safe.** This is a route
 * handler, not a page: Next generates it once at build and never again, and
 * `updateTag` can't reach it because it has no cache tag of its own. Without this it
 * would faithfully serve the name the site had on deploy day, forever. An hour matches
 * the content cache's own TTL.
 */
export const revalidate = 3600;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { general } = await getSiteContent();

  return {
    // `||`, not `??`: an empty string is what an owner leaves behind by clearing the
    // field, and it should fall back rather than render an empty install prompt.
    name: general.siteName || SITE_NAME,
    short_name: general.siteName || SITE_NAME,
    description: general.seoDescription || SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#131c2c",
    icons: [
      { src: "/icon", sizes: "32x32", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
