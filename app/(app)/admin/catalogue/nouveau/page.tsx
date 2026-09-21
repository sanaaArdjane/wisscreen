import type { Metadata } from "next";
import { requirePermission } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { CatalogueForm } from "../CatalogueForm";

export const metadata: Metadata = { title: "Nouvelle offre" };

export default async function NewCatalogueItemPage() {
  await requirePermission("subscriptions:write");
  return (
    <>
      <PageHeader title="Nouvelle offre" backHref="/admin/catalogue" backLabel="Catalogue" />
      <Panel className="max-w-4xl">
        <CatalogueForm />
      </Panel>
    </>
  );
}
