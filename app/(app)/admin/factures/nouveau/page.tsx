import type { Metadata } from "next";
import { asc, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { QuoteEditor } from "../../devis/QuoteEditor";

export const metadata: Metadata = { title: "Nouvelle facture" };

export default async function NewInvoicePage({ searchParams }: PageProps<"/admin/factures/nouveau">) {
  await requirePermission("invoices:write");
  const { client } = await searchParams;
  const clients = await db
    .select({ id: userTable.id, name: userTable.name, email: userTable.email })
    .from(userTable)
    .where(ne(userTable.role, "staff"))
    .orderBy(asc(userTable.name));

  return (
    <>
      <PageHeader
        title="Nouvelle facture"
        description="Créée en brouillon. Le client ne la voit qu'une fois émise. Pour facturer un devis accepté, utilisez plutôt « Créer la facture » depuis le devis."
        backHref="/admin/factures"
        backLabel="Factures"
      />
      <Panel className="max-w-4xl">
        <QuoteEditor
          kind="invoice"
          clients={clients.map((c) => ({ value: c.id, label: `${c.name} — ${c.email}` }))}
          defaultUserId={typeof client === "string" ? client : undefined}
        />
      </Panel>
    </>
  );
}
