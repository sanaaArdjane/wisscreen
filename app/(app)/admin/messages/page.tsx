import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { contactLeads } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { EmptyState, StatusChip } from "@/components/dashboard/ui";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { LeadActions } from "./LeadActions";
import { SERVICES } from "@/lib/data/services";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Messages du site" };

const LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  traite: "Traité",
  archive: "Archivé",
};

const TONE: Record<string, string> = {
  nouveau: "bg-signal/15 text-ink border-signal/45",
  traite: "bg-teal/15 text-ink border-teal/40",
  archive: "bg-ink/5 text-ink border-ink/15",
};

const SERVICE_NAMES = new Map(SERVICES.map((s) => [s.slug, s.name]));

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  const staff = await requirePermission("leads:read");
  const { statut } = await searchParams;
  const status = typeof statut === "string" ? statut : "nouveau";

  const rows = await db
    .select()
    .from(contactLeads)
    .where(status === "tous" ? undefined : eq(contactLeads.status, status))
    .orderBy(desc(contactLeads.createdAt))
    .limit(200);

  return (
    <>
      <PageHeader
        title="Messages du site"
        description="Les envois du formulaire de contact des pages publiques."
      />

      <FilterBar
        basePath="/admin/messages"
        searchPlaceholder="Rechercher…"
        filters={[
          {
            name: "statut",
            label: "Statut",
            value: status,
            options: [
              { value: "nouveau", label: "Nouveaux" },
              { value: "traite", label: "Traités" },
              { value: "archive", label: "Archivés" },
              { value: "tous", label: "Tous" },
            ],
          },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Aucun message"
          description="Les messages envoyés depuis le formulaire de contact arrivent ici."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((lead) => (
            <Panel
              key={lead.id}
              title={lead.name}
              description={`${lead.email}${lead.solution ? ` · ${SERVICE_NAMES.get(lead.solution) ?? lead.solution}` : ""} · ${formatDateTime(lead.createdAt)}`}
              actions={
                <StatusChip
                  label={LABELS[lead.status] ?? lead.status}
                  tone={TONE[lead.status] ?? TONE.nouveau}
                />
              }
            >
              <p className="whitespace-pre-wrap text-sm text-ink/80">{lead.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-4">
                <a
                  href={`mailto:${lead.email}?subject=${encodeURIComponent("Votre message à WICLOUD")}`}
                  className="text-sm text-signal-deep underline underline-offset-4"
                >
                  Répondre par e-mail
                </a>
                {can(staff, "leads:write") && (
                  <LeadActions id={lead.id} status={lead.status} />
                )}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
