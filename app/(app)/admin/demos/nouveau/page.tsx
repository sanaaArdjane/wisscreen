import type { Metadata } from "next";
import { requirePermission } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { encryptionConfigured } from "@/lib/crypto";
import { MAX_UPLOAD_BYTES, storageConfigured } from "@/lib/storage";
import { getSolutions } from "@/lib/content";
import { DemoEditor } from "../DemoEditor";

export const metadata: Metadata = { title: "Nouvelle démo" };

export default async function NouvelleDemoPage() {
  await requirePermission("demos:write");
  return (
    <>
      <PageHeader
        title="Nouvelle démo"
        description="Elle est créée en brouillon : aucun client ne la voit avant sa publication et l'attribution d'un accès."
        backHref="/admin/demos"
        backLabel="Démos"
      />
      <Panel className="max-w-5xl">
        <DemoEditor
          services={(await getSolutions({ includeHidden: true })).map((s) => ({ value: s.slug, label: s.name }))}
          encryption={encryptionConfigured()}
          storage={storageConfigured()}
          maxUploadBytes={MAX_UPLOAD_BYTES}
        />
      </Panel>
    </>
  );
}
