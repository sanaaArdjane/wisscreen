import type { MoneyLine } from "@/lib/db/schema";
import type { PreviewDoc, PreviewLine } from "@/components/dashboard/billing/DocumentPreview";

/** A stored line as the preview/editor edits it: strings, French decimal comma. */
export function toPreviewLines(lines: MoneyLine[]): PreviewLine[] {
  return lines.map((l) => ({
    label: l.label,
    quantity: String(l.quantity),
    unit: l.unitCents ? String(l.unitCents / 100).replace(".", ",") : "",
  }));
}

/** Build the read-only preview of a stored devis or facture. */
export function previewDoc(input: {
  kind: "quote" | "invoice";
  ref: string;
  title: string;
  note: string | null;
  date: Date;
  dueAt: Date | null;
  currency: string;
  lines: MoneyLine[];
  client: PreviewDoc["client"];
  sourceRef?: string | null;
}): PreviewDoc {
  return {
    kind: input.kind,
    ref: input.ref,
    title: input.title,
    note: input.note ?? "",
    date: input.date,
    dueAt: input.dueAt ? input.dueAt.toISOString().slice(0, 10) : "",
    currency: input.currency,
    lines: toPreviewLines(input.lines),
    client: input.client,
    sourceRef: input.sourceRef,
  };
}
