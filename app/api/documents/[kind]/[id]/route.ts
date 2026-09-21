import { getCurrentUser } from "@/lib/guard";
import { can } from "@/lib/permissions";
import { renderBillingPdf } from "@/lib/pdf/render";

/**
 * `/api/documents/devis/12` and `/api/documents/facture/7` — the PDF, rendered
 * on demand from the current data.
 *
 * A customer gets their own, and never a draft (`brouillon`), matching the
 * `status <> 'brouillon'` filter on their devis pages. Staff with the read
 * permission get any. Everything else is a 404 — "document 12 exists" is
 * itself information. `?download=1` forces a save instead of the browser's
 * viewer.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || user.banned) return new Response("Unauthorized", { status: 401 });

  const { kind: slug, id: raw } = await params;
  const kind = slug === "devis" ? "quote" : slug === "facture" ? "invoice" : null;
  const id = Number(raw);
  if (!kind || !Number.isInteger(id)) return new Response("Not found", { status: 404 });

  const doc = await renderBillingPdf(kind, id);
  if (!doc) return new Response("Not found", { status: 404 });

  const staff = can(user, kind === "quote" ? "quotes:read" : "invoices:read");
  const own = doc.ownerId === user.id && doc.status !== "brouillon";
  if (!staff && !own) return new Response("Not found", { status: 404 });

  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(new Uint8Array(doc.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${doc.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
