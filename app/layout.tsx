import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema } from "@/lib/seo/schema";
import { SITE_LOCALE, SITE_URL } from "@/lib/site";
import { getSiteContent } from "@/lib/content";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * The site name, default title, description and keywords are edited in /admin/site
 * (« Général » → SEO), so this reads them from the cached site content. The read is
 * tagged and cached like every other public-site read — no query per request.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { general } = await getSiteContent();
  const SITE_NAME = general.siteName || "WICLOUD";
  const TITLE_DEFAULT = general.seoTitle || SITE_NAME;
  const SITE_DESCRIPTION = general.seoDescription;

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: TITLE_DEFAULT,
      // Every route below sets a bare title (e.g. "OCR") and gets this suffix for free,
      // instead of every generateMetadata call re-concatenating "— WICLOUD" itself.
      template: `%s — ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME, url: SITE_URL }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    keywords: general.keywords,
    alternates: {
      canonical: "/",
    },
    // Full-width, unclipped preview snippets/images — the opposite of Google's default
    // caps, which is worth opting out of for a marketing site that wants rich results.
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: SITE_LOCALE,
      url: SITE_URL,
      siteName: SITE_NAME,
      title: TITLE_DEFAULT,
      description: SITE_DESCRIPTION,
      // No `images` here on purpose — the app/opengraph-image.tsx file convention
      // generates and attaches it automatically; listing it again would duplicate tags.
    },
    twitter: {
      card: "summary_large_image",
      title: TITLE_DEFAULT,
      description: SITE_DESCRIPTION,
    },
    formatDetection: {
      // Prevents iOS/Android from auto-linking stray digit runs (a stat like "24/7" or
      // "99,95%") as a phone number.
      telephone: false,
    },
  };
}

/**
 * Document shell only. `Navbar`/`Footer` used to live here, but the dashboard and
 * the auth pages must not inherit the marketing chrome — they moved down into
 * `app/(marketing)/layout.tsx`. The group leaves every public URL unchanged.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink" suppressHydrationWarning>
        <JsonLd data={organizationSchema()} />
        {children}
      </body>
    </html>
  );
}
