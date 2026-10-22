import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { requests, user } from "@/lib/db/schema";
import { requirePermission } from "@/lib/guard";
import { PageHeader, Panel } from "@/components/dashboard/PageHeader";
import { encryptionConfigured } from "@/lib/crypto";
import { slugify } from "@/lib/demos";
import { MAX_UPLOAD_BYTES, storageConfigured } from "@/lib/storage";
import { getSolutions } from "@/lib/content";
import { DemoEditor } from "../DemoEditor";

export const metadata: Metadata = { title: "Nouvelle démo" };

/**
 * `?demande=ID` answers a customer's demande: the title, solution and slug are
 * prefilled and the customer is attached on creation. `?client=ID` does the
 * same for a customer with no demande (the desk offering a demo unprompted).
 */
export default async function NouvelleDemoPage({ searchParams }: PageProps<"/admin/demos/nouveau">) {
  await requirePermission("demos:write");
  const sp = await searchParams;
  const requestId = Number(sp.demande);
  const clientId = typeof sp.client === "string" ? sp.client : undefined;

  const solutions = await getSolutions({ includeHidden: true });
  const [row] = Number.isInteger(requestId)
    ? await db
        .select({ request: requests, client: user })
        .from(requests)
        .innerJoin(user, eq(user.id, requests.userId))
        .where(eq(requests.id, requestId))
        .limit(1)
    : [];
  const [clientRow] =
    !row && clientId ? await db.select().from(user).where(eq(user.id, clientId)).limit(1) : [];

  const client = row?.client ?? clientRow;
  const solution = solutions.find((s) => s.slug === row?.request.serviceSlug);
  const meta = row
    ? {
        title: `Démo ${solution?.name ?? ""} — ${row.client.name}`.replace("  ", " "),
        slug: slugify(`${solution?.slug ?? "demo"}-${row.request.ref}`),
        serviceSlug: row.request.serviceSlug,
        summary: row.request.details.slice(0, 300),
      }
    : {};

  return (
    <>
      <PageHeader
        title="Nouvelle démo"
        description={
          row
            ? `Pour la demande ${row.request.ref} de ${row.client.name}. Elle sera attribuée à ce client dès la création.`
            : client
              ? `Pour ${client.name}. Elle sera attribuée à ce client dès la création.`
              : "Elle est créée en brouillon : aucun client ne la voit avant sa publication et l'attribution d'un accès."
        }
        backHref={row ? `/admin/demandes/${row.request.id}` : "/admin/demos"}
        backLabel={row ? "Demande" : "Démos"}
      />
      <Panel className="max-w-5xl">
        <DemoEditor
          meta={meta}
          grant={
            client
              ? { userId: client.id, requestId: row?.request.id, label: `${client.name} (${client.email})` }
              : undefined
          }
          services={solutions.map((s) => ({ value: s.slug, label: s.name }))}
          encryption={encryptionConfigured()}
          storage={storageConfigured()}
          maxUploadBytes={MAX_UPLOAD_BYTES}
        />
      </Panel>
    </>
  );
}
