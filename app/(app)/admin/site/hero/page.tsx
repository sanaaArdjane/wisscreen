import type { Metadata } from "next";
import { readContentUpdates, readSiteContent } from "@/lib/content";
import { BlockEditor } from "@/components/dashboard/site/BlockEditor";
import { editorContext } from "../content-props";

export const metadata: Metadata = { title: "Hero — Configuration du site" };

export default async function HeroEditorPage() {
  const [content, updates, ctx] = await Promise.all([readSiteContent(), readContentUpdates(), editorContext()]);
  const updated = updates.get("hero");
  return (
    <div className="rounded-3xl bg-panel p-5 ring-1 ring-fg/10 sm:p-8">
      <BlockEditor
        key={updated?.toISOString() ?? "default"}
        blockKey="hero"
        initial={content.hero}
        stored={Boolean(updated)}
        viewHref="/"
        {...ctx}
      />
    </div>
  );
}
