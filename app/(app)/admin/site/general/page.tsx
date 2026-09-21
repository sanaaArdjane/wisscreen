import type { Metadata } from "next";
import { readContentUpdates, readSiteContent } from "@/lib/content";
import { BlockEditor } from "@/components/dashboard/site/BlockEditor";
import { Panel } from "@/components/dashboard/PageHeader";
import { editorContext } from "../content-props";

export const metadata: Metadata = { title: "Général — Configuration du site" };

export default async function GeneralEditorPage() {
  const [content, updates, ctx] = await Promise.all([readSiteContent(), readContentUpdates(), editorContext()]);
  const general = updates.get("general");
  const footer = updates.get("footer");
  return (
    <div className="flex flex-col gap-6">
      <Panel title="Général" description="Nom du site, référencement, coordonnées et réseaux sociaux.">
        <BlockEditor
          key={general?.toISOString() ?? "default"}
          blockKey="general"
          initial={content.general}
          stored={Boolean(general)}
          viewHref="/#contact"
          {...ctx}
        />
      </Panel>
      <Panel title="Pied de page" description="Le bas de toutes les pages du site public.">
        <BlockEditor
          key={footer?.toISOString() ?? "default"}
          blockKey="footer"
          initial={content.footer}
          stored={Boolean(footer)}
          viewHref="/#contact"
          {...ctx}
        />
      </Panel>
    </div>
  );
}
