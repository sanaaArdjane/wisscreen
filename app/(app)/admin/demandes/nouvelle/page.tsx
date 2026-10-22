import type { Metadata } from "next";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { demos } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { getSolutions } from "@/lib/content";
import { PRIORITY_LABELS, REQUEST_PRIORITIES, REQUEST_TYPES, TYPE_LABELS } from "@/lib/requests";
import { serviceFormOptions } from "../../abonnements/options";
import { NewRequestForClientForm } from "./NewRequestForClientForm";

export const metadata: Metadata = { title: "Nouvelle demande pour un client" };

export default async function NewRequestForClientPage({ searchParams }: PageProps<"/admin/demandes/nouvelle">) {
  const staff = await requirePermission("requests:write");
  const sp = await searchParams;
  const [{ clients, plansList }, solutions] = await Promise.all([
    serviceFormOptions(),
    getSolutions({ includeHidden: true }),
  ]);
  // Only offered to staff who may actually hand them over.
  const demoOptions = can(staff, "demos:write")
    ? (await db.select({ id: demos.id, title: demos.title, status: demos.status }).from(demos).orderBy(desc(demos.createdAt)).limit(100)).map(
        (d) => ({ value: String(d.id), label: d.status === "publie" ? d.title : `${d.title} (brouillon)` }),
      )
    : [];
  const planOptions = can(staff, "subscriptions:write") ? plansList.map((p) => ({ value: p.value, label: p.label })) : [];

  return (
    <>
      <PageHeader
        title="Nouvelle demande pour un client"
        description="Proposez une démo, un service ou une consultation : le client la retrouve dans son espace et peut répondre."
        backHref="/admin/demandes"
        backLabel="Demandes"
      />
      <Panel className="max-w-3xl">
        <NewRequestForClientForm
          clients={clients}
          typeOptions={REQUEST_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
          serviceOptions={solutions.map((s) => ({ value: s.slug, label: s.name }))}
          priorityOptions={REQUEST_PRIORITIES.map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
          defaultClient={typeof sp.client === "string" ? sp.client : undefined}
          defaultType={typeof sp.type === "string" ? sp.type : undefined}
          demoOptions={demoOptions}
          planOptions={planOptions}
        />
      </Panel>
    </>
  );
}
