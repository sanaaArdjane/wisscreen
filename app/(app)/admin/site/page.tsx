import type { Metadata } from "next";
import Link from "next/link";
import { readContentUpdates, readSiteContent, readSolutionRecords } from "@/lib/content";
import { SECTION_KEYS } from "@/lib/content/schema";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/lib/types";
import { storageConfigured } from "@/lib/storage";

export const metadata: Metadata = { title: "Configuration du site" };

const MODE_LABELS = {
  earth: "Terre 3D",
  stack: "Infrastructure 3D",
  image: "Image",
  video: "Vidéo",
  slides: "Diaporama",
} as const;

const fmt = (d?: Date) =>
  d
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Algiers" }).format(d)
    : "Texte d'origine";

export default async function SiteOverviewPage() {
  const [content, updates, { records, fromDefaults }] = await Promise.all([
    readSiteContent(),
    readContentUpdates(),
    readSolutionRecords(),
  ]);

  const hiddenSections = SECTION_KEYS.filter((k) => content.sections[k].hidden).length;
  const sectionUpdates = SECTION_KEYS.map((k) => updates.get(k)).filter((d): d is Date => Boolean(d));
  const lastSection = sectionUpdates.sort((a, b) => b.getTime() - a.getTime())[0];
  const published = records.filter((r) => r.published).length;

  const cards: { href: string; icon: IconName; title: string; lines: string[]; updated?: Date }[] = [
    {
      href: "/admin/site/hero",
      icon: "sparkles",
      title: "Hero",
      lines: [`Visuel : ${MODE_LABELS[content.hero.visual.mode]}`, `« ${content.hero.headline} … »`],
      updated: updates.get("hero"),
    },
    {
      href: "/admin/site/accueil",
      icon: "layers",
      title: "Sections de l'accueil",
      lines: [
        `${SECTION_KEYS.length} sections, ${hiddenSections} masquée${hiddenSections > 1 ? "s" : ""}`,
        `${sectionUpdates.length} modifiée${sectionUpdates.length > 1 ? "s" : ""}`,
      ],
      updated: lastSection,
    },
    {
      href: "/admin/site/solutions",
      icon: "store",
      title: "Solutions",
      lines: [
        `${published} publiée${published > 1 ? "s" : ""} sur ${records.length}`,
        records.map((r) => r.content.shortName).join(" · "),
      ],
    },
    {
      href: "/admin/site/general",
      icon: "settings",
      title: "Général & pied de page",
      lines: [
        content.general.contact.email || "Aucun e-mail de contact",
        `${Object.values(content.general.socials).filter(Boolean).length} réseau(x) social(aux)`,
      ],
      updated: updates.get("general"),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {fromDefaults && (
        <p className="rounded-2xl bg-soft px-4 py-3 text-sm text-fg">
          Les solutions affichées sont celles fournies avec le site. Elles seront copiées ici dès votre première
          modification, sans rien changer à ce que voient les visiteurs.
        </p>
      )}
      {!storageConfigured() && (
        <p className="rounded-2xl bg-soft px-4 py-3 text-sm text-fg">
          Le stockage de fichiers n&apos;est pas configuré : vous pouvez coller des liens vers vos images et vidéos,
          mais pas en téléverser.
        </p>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <li key={card.href}>
            <Link
              href={card.href}
              className="group flex h-full flex-col gap-3 rounded-3xl bg-panel p-6 ring-1 ring-fg/10 transition-colors hover:ring-fg/30"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-soft text-fg">
                  <Icon name={card.icon} className="h-5 w-5" />
                </span>
                <span className="text-lg font-[650] text-fg">{card.title}</span>
                <Icon name="arrow-right" className="ml-auto h-5 w-5 text-fg transition-transform group-hover:translate-x-1" />
              </span>
              <span className="flex flex-col gap-1 text-sm text-fg/80">
                {card.lines.map((line, i) => (
                  <span key={i} className="truncate">
                    {line}
                  </span>
                ))}
              </span>
              {"updated" in card && (
                <span className="mt-auto text-xs text-fg/80">Dernière modification : {fmt(card.updated)}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
