import type { Metadata } from "next";
import { asc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { requests, user as userTable } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { QuoteEditor } from "../QuoteEditor";

export const metadata: Metadata = { title: "Nouveau devis" };

export default async function NouveauDevisPage({ searchParams }: PageProps<"/admin/devis/nouveau">) {
  await requirePermission("quotes:write");
  const { demande } = await searchParams;

  const requestId = typeof demande === "string" ? Number(demande) : NaN;

  const [clients, linked] = await Promise.all([
    db
      .select({ id: userTable.id, name: userTable.name, email: userTable.email })
      .from(userTable)
      // Staff accounts are excluded: a devis addressed to a colleague is always
      // a mis-click, and the list is long enough without them.
      .where(ne(userTable.role, "staff"))
      .orderBy(asc(userTable.name)),
    Number.isInteger(requestId)
      ? db.select().from(requests).where(eq(requests.id, requestId)).limit(1)
      : Promise.resolve([]),
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

      <Panel className="max-w-4xl">
        <QuoteEditor
          clients={clients.map((c) => ({ value: c.id, label: `${c.name} — ${c.email}` }))}
          defaultUserId={request?.userId}
          requestId={request?.id}
          requestLabel={request ? `${request.ref} — ${request.title}` : undefined}
          title={request?.title}
        />
      </Panel>
    </>
  );
}
