import type { ReactNode } from "react";
import { requirePermission } from "@/lib/guard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SiteTabs } from "@/components/dashboard/site/SiteTabs";

/**
 * /admin/site — the public site's content, media and solutions. Reading needs
 * `site:read`; every save re-checks `site:write` in its action.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  await requirePermission("site:read");
  return (
    <>
      <PageHeader
        title="Configuration du site"
        description="Textes, images, vidéos et solutions du site public. Survolez le ⓘ d'un champ pour savoir où il s'affiche."
        actions={
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-[650] text-fg ring-1 ring-fg/20 hover:bg-fg/8"
          >
            Ouvrir le site ↗
          </a>
        }
      />
      <div className="flex flex-col gap-6">
        <SiteTabs />
        {children}
      </div>
    </>
  );
}
