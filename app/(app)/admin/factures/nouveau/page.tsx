import type { Metadata } from "next";
import { requirePermission } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { DocumentEditor } from "@/components/dashboard/billing/DocumentEditor";
import { listBillableClients } from "@/lib/server/queries";
import { getCompany } from "@/lib/settings";
import { storageConfigured } from "@/lib/storage";

export const metadata: Metadata = { title: "Nouvelle facture" };

export default async function NewInvoicePage({ searchParams }: PageProps<"/admin/factures/nouveau">) {
  await requirePermission("invoices:write");
  const { client } = await searchParams;
  const [clients, company] = await Promise.all([listBillableClients(), getCompany()]);

  return (
    <>
      <PageHeader
        title="Nouvelle facture"
        description="Créée en brouillon ; le client ne la voit qu'une fois émise. Pour facturer un devis accepté, utilisez plutôt « Créer la facture » depuis le devis."
        backHref="/admin/factures"
        backLabel="Factures"
      />
      <Panel>
        <DocumentEditor
          kind="invoice"
          clients={clients}
          defaultUserId={typeof client === "string" ? client : undefined}
          company={company}
          storage={storageConfigured()}
        />
      </Panel>
    </>
  );
}
