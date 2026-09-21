"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/types";
import { cn } from "@/lib/cn";

const TABS: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: "/admin/site", label: "Vue d'ensemble", icon: "home", exact: true },
  { href: "/admin/site/hero", label: "Hero", icon: "sparkles" },
  { href: "/admin/site/accueil", label: "Sections de l'accueil", icon: "layers" },
  { href: "/admin/site/solutions", label: "Solutions", icon: "store" },
  { href: "/admin/site/general", label: "Général & pied de page", icon: "settings" },
];

/** The sub-navigation of /admin/site. Scrolls sideways on a phone rather than wrapping. */
export function SiteTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Configuration du site" className="-mx-1 overflow-x-auto pb-1">
      <ul className="flex w-max gap-1 rounded-full bg-soft p-1">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-[650] transition-colors",
                  active ? "bg-fg text-on-fg" : "text-fg hover:bg-fg/8",
                )}
              >
                <Icon name={tab.icon} className="h-4 w-4" />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
