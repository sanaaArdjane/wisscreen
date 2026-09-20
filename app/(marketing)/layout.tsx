import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/**
 * The public site's chrome. Everything under this group — `/` and
 * `/solutions/[slug]` — renders between the nav and the footer; `/connexion`,
 * `/dashboard` and `/admin` sit outside it and bring their own.
 *
 * The group changes no URL: `app/(marketing)/page.tsx` is still `/`.
 */
export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
