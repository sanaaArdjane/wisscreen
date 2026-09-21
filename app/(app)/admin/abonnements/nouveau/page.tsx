import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quotes, requests } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { ServiceForm } from "../ServiceForm";
import { serviceFormOptions } from "../options";

export const metadata: Metadata = { title: "Provisionner un service" };

export default async function NewServicePage({ searchParams }: PageProps<"/admin/abonnements/nouveau">) {
  await requirePermission("subscriptions:write");
  const sp = await searchParams;
  const requestId = Number(sp.demande);
  const quoteId = Number(sp.devis);
  const client = typeof sp.client === "string" ? sp.client : undefined;

  const [options, [request], [quote]] = await Promise.all([
    serviceFormOptions(),
    Number.isInteger(requestId) ? db.select().from(requests).where(eq(requests.id, requestId)).limit(1) : Promise.resolve([]),
    Number.isInteger(quoteId) ? db.select().from(quotes).where(eq(quotes.id, quoteId)).limit(1) : Promise.resolve([]),
  ]);

  const back = request ? `/admin/demandes/${request.id}` : quote ? `/admin/devis/${quote.id}` : "/admin/abonnements";

  return (
    <>
      <PageHeader
        title="Provisionner un service"
        description={
          request
            ? `Pour la demande ${request.ref} — ${request.title}.`
            : quote
              ? `Suite au devis ${quote.ref} — ${quote.title}.`
              : "Un serveur, une infrastructure, un service à la consommation que ce client a souscrit."
        }
        backHref={back}
        backLabel="Retour"
      />
      <Panel className="max-w-4xl">
        <ServiceForm
          clients={options.clients}
          plansList={options.plansList}
          service={{
            userId: request?.userId ?? quote?.userId ?? client,
            requestId: request?.id ?? quote?.requestId,
            quoteId: quote?.id,
            label: quote?.title ?? undefined,
            price: quote ? String(quote.amountCents / 100) : undefined,
            currency: quote?.currency,
          }}
        />
      </Panel>
    </>
  );
}
