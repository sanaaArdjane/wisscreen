import type { Metadata } from "next";
import { readContentUpdates, readSiteContent } from "@/lib/content";
import { SECTION_KEYS } from "@/lib/content/schema";
import { SECTION_META } from "@/lib/content/forms";
import { BlockEditor } from "@/components/dashboard/site/BlockEditor";
import { SectionCard } from "@/components/dashboard/site/SectionCard";
import { editorContext } from "../content-props";

export const metadata: Metadata = { title: "Sections de l'accueil — Configuration du site" };

/**
 * Every homepage section below the hero, **in the order the page shows them**, each
 * saved on its own. The hero has its own tab; the solutions' own cards are edited in
 * the Solutions tab (a note says so wherever a section draws from them).
 */
export default async function HomeSectionsPage() {
  const [content, updates, ctx] = await Promise.all([readSiteContent(), readContentUpdates(), editorContext()]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-fg/80">
        Les sections sont listées dans l&apos;ordre de la page d&apos;accueil, sous le hero. Ouvrez-en une pour la
        modifier ; chacune s&apos;enregistre séparément. Les cartes des solutions se règlent dans l&apos;onglet
        « Solutions ».
      </p>
      <ol className="flex flex-col gap-3">
        {SECTION_KEYS.map((key, index) => {
          const meta = SECTION_META[key];
          const updated = updates.get(key);
          return (
            <SectionCard
              key={key}
              index={index}
              title={meta.title}
              summary={meta.summary}
              anchor={meta.anchor}
              hidden={content.sections[key].hidden}
              modified={Boolean(updated)}
            >
              <BlockEditor
                key={updated?.toISOString() ?? "default"}
                blockKey={key}
                initial={content.sections[key]}
                stored={Boolean(updated)}
                viewHref={`/#${meta.anchor}`}
                compact
                {...ctx}
              />
            </SectionCard>
          );
        })}
      </ol>
    </div>
  );
}
