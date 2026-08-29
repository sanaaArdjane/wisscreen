/**
 * Single source of truth for the production origin. Every canonical URL, sitemap
 * entry, robots.txt host, Open Graph URL and JSON-LD `url` field reads this — so
 * pointing the whole site at a new domain later is one env var
 * (`NEXT_PUBLIC_SITE_URL` in `.env.local` / the hosting provider's env settings),
 * never a codebase-wide search.
 */
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wisscreen.rflabs.tech";

export const SITE_URL = rawSiteUrl.replace(/\/+$/, "");
export const SITE_NAME = "Wissal Univers";
export const SITE_LOCALE = "fr_FR";
export const SITE_DESCRIPTION =
  "Wissal Univers conçoit OCR, WICLOUD, WIFACILITY et SETYCORE : des solutions IT qui connectent banques, partenaires et particuliers.";
