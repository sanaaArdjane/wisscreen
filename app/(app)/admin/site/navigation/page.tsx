import type { Metadata } from "next";
import { readContentUpdates, readSiteContent } from "@/lib/content";
import { BlockEditor } from "@/components/dashboard/site/BlockEditor";
import { Panel } from "@/components/dashboard/PageHeader";
import { editorContext } from "../content-props";

export const metadata: Metadata = { title: "Navigation — Configuration du site" };

export default async function NavigationEditorPage() {
  const [content, updates, ctx] = await Promise.all([readSiteContent(), readContentUpdates(), editorContext()]);
  const nav = updates.get("nav");
  return (
    <Panel
      title="Barre de navigation"
      description="Les entrées du menu en haut du site public. Une entrée avec un sous-menu devient un menu déroulant."
    >
      <BlockEditor
        key={nav?.toISOString() ?? "default"}
        blockKey="nav"
        initial={content.nav}
        stored={Boolean(nav)}
        viewHref="/"
        {...ctx}
      />
    </Panel>
  );
}
