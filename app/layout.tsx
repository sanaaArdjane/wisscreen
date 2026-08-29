import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema } from "@/lib/seo/schema";
import { SITE_DESCRIPTION, SITE_LOCALE, SITE_NAME, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const TITLE_DEFAULT =
  "Wissal Univers — Solutions IT pour banques, entreprises et particuliers";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    // Every route below sets a bare title (e.g. "OCR") and gets this suffix for free,
    // instead of every generateMetadata call re-concatenating "— Wissal Univers" itself.
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  keywords: [
    "Wissal Univers",
    "OCR",
    "extraction de données",
    "reconnaissance de caractères",
    "cloud souverain",
    "WICLOUD",
    "paiement échelonné",
    "WIFACILITY",
    "Etaysir",
    "marketplace",
    "SETYCORE",
    "solutions IT banques",
  ],
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-paper text-ink" suppressHydrationWarning>
        <JsonLd data={organizationSchema()} />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
