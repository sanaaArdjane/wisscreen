import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requests } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { DocumentEditor } from "@/components/dashboard/billing/DocumentEditor";
import { listBillableClients } from "@/lib/server/queries";
import { getCompany } from "@/lib/settings";
import { storageConfigured } from "@/lib/storage";

export const metadata: Metadata = { title: "Nouveau devis" };

export default async function NouveauDevisPage({ searchParams }: PageProps<"/admin/devis/nouveau">) {
  await requirePermission("quotes:write");
  const { demande } = await searchParams;
  const requestId = typeof demande === "string" ? Number(demande) : NaN;

  const [clients, linked, company] = await Promise.all([
    listBillableClients(),
    Number.isInteger(requestId)
      ? db.select().from(requests).where(eq(requests.id, requestId)).limit(1)
      : Promise.resolve([]),
    getCompany(),
  ]);
  const request = linked[0];

  return (
    <>
      <PageHeader
        title="Nouveau devis"
        description="Il part en brouillon : rien n'est visible par le client tant que vous ne l'envoyez pas."
        backHref={request ? `/admin/demandes/${request.id}` : "/admin/devis"}
        backLabel={request ? "Retour à la demande" : "Devis"}
      />
      <Panel>
        <DocumentEditor
          kind="quote"
          clients={clients}
          defaultUserId={request?.userId}
          requestId={request?.id}
          requestLabel={request ? `${request.ref} — ${request.title}` : undefined}
          title={request?.title}
          company={company}
          storage={storageConfigured()}
        />
      </Panel>
    </>
  );
}
