import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getSiteContent, getSolutions } from "@/lib/content";

/**
 * The public site's chrome. Everything under this group — `/` and
 * `/solutions/[slug]` — renders between the nav and the footer; `/connexion`,
 * `/dashboard` and `/admin` sit outside it and bring their own.
 *
 * The group changes no URL: `app/(marketing)/page.tsx` is still `/`.
 *
 * Both reads are cached and tagged (`lib/content`), so this stays static; an edit in
 * /admin/site expires the tag and the next visit gets the new nav and footer.
 */
export default async function MarketingLayout({ children }: LayoutProps<"/">) {
  const [content, solutions] = await Promise.all([getSiteContent(), getSolutions()]);
  return (
    <>
      <Navbar solutions={solutions.map(({ slug, name, shortName }) => ({ slug, name, shortName }))} />
      {children}
      <Footer
        footer={content.footer}
        general={content.general}
        solutions={solutions.map(({ slug, name }) => ({ slug, name }))}
      />
    </>
  );
}
