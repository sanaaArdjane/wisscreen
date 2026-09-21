import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readSolutionRecords } from "@/lib/content";
import { SolutionEditor } from "@/components/dashboard/site/SolutionEditor";
import { editorContext } from "../../content-props";

export const metadata: Metadata = { title: "Modifier une solution — Configuration du site" };

export default async function SolutionEditorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ records }, ctx] = await Promise.all([readSolutionRecords(), editorContext()]);
  const record = records.find((r) => r.slug === slug);
  if (!record) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-[650] text-fg">{record.content.name}</h2>
      <SolutionEditor
        key={record.slug}
        initialContent={record.content}
        initialMedia={record.media}
        initialPublished={record.published}
        {...ctx}
      />
    </div>
  );
}
