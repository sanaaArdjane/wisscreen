"use client";

import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";
import type { CompanyIdentity } from "@/lib/company";
import { formatMoney, parseMoneyToCents, withVat } from "@/lib/money";

/**
 * The devis / facture as it will print, drawn in HTML beside the editor.
 *
 * It mirrors `lib/pdf/BillingDocument.tsx` block for block — header, issuer and
 * recipient, table, HT / TVA / TTC, remarks, terms, signature, legal footer —
 * so what the admin sees while typing is what the customer receives. It is not
 * the PDF itself: the real render is one click away ("Aperçu PDF exact"), and
 * if the two ever disagree, the PDF is the document.
 *
 * With `editable`, every printed field can be changed right here: click it,
 * type, click away. Company fields edited here become this document's
 * *overrides* — the Paramètres identity is untouched.
 *
 * Drawn at A4 width (794px @96dpi) and scaled to fit, so the proportions are
 * the paper's at any column width. Colours are the PDF's fixed hexes on
 * white, whatever the dashboard theme — it is a picture of paper.
 */

export type PreviewLine = { label: string; quantity: string; unit: string };

export type PreviewDoc = {
  kind: "quote" | "invoice";
  ref: string;
  title: string;
  note: string;
  date: Date;
  dueAt: string; // yyyy-mm-dd or ""
  currency: string;
  lines: PreviewLine[];
  client: { name: string; email: string; company: string | null; phone: string | null } | null;
  sourceRef?: string | null;
};

const PAGE_W = 794;
const DATE = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" });

function lineCents(l: PreviewLine): number {
  const q = Number(l.quantity.replace(",", ".").replace(/\s/g, "")) || 0;
  const u = parseMoneyToCents(l.unit || "0") ?? 0;
  return Math.round(q * u);
}

export function previewTotal(lines: PreviewLine[]): number {
  return lines.reduce((sum, l) => sum + lineCents(l), 0);
}

/**
 * One printed field, editable in place. Remounted when its value changes from
 * outside (the form on the left), so the DOM and React never disagree about
 * the text inside a `contentEditable`.
 */
function E({
  value,
  onChange,
  placeholder,
  multiline,
  editable,
  className,
  align,
}: {
  value: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  editable: boolean;
  className?: string;
  align?: "right";
}) {
  if (!editable || !onChange) {
    return value ? <span className={cn("whitespace-pre-wrap", className)}>{value}</span> : null;
  }
  return (
    <span
      key={value}
      role="textbox"
      aria-label={placeholder}
      aria-multiline={multiline || undefined}
      tabIndex={0}
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={(e) => {
        const next = (e.currentTarget.innerText ?? "").replace(/ /g, " ").trim();
        if (next !== value) onChange(next);
      }}
      onKeyDown={(e: KeyboardEvent<HTMLSpanElement>) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          e.currentTarget.blur();
        }
        if (e.key === "Escape") {
          e.currentTarget.innerText = value;
          e.currentTarget.blur();
        }
      }}
      className={cn(
        "inline-block min-w-[2ch] cursor-text whitespace-pre-wrap rounded-[3px] outline-none transition-shadow",
        "hover:shadow-[0_0_0_1px_rgba(19,193,130,0.6)] focus:bg-[#13C182]/10 focus:shadow-[0_0_0_2px_#13C182]",
        "empty:before:text-[#8a94a8] empty:before:content-[attr(data-placeholder)]",
        align === "right" && "text-right",
        className,
      )}
    >
      {value}
    </span>
  );
}

export function DocumentPreview({
  doc,
  company,
  editable = false,
  onDoc,
  onCompany,
}: {
  doc: PreviewDoc;
  /** The effective identity: Paramètres plus this document's overrides. */
  company: CompanyIdentity;
  editable?: boolean;
  onDoc?: (patch: Partial<PreviewDoc>) => void;
  onCompany?: <K extends keyof CompanyIdentity>(key: K, value: CompanyIdentity[K]) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [height, setHeight] = useState(1123);

  useLayoutEffect(() => {
    const el = box.current;
    const pg = page.current;
    if (!el || !pg) return;
    const update = () => {
      setScale(Math.min(1, el.clientWidth / PAGE_W));
      setHeight(pg.offsetHeight);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(pg);
    return () => ro.disconnect();
  }, []);

  const isQuote = doc.kind === "quote";
  const subtotal = previewTotal(doc.lines);
  const vat = company.vatRate > 0 ? withVat(subtotal, company.vatRate) - subtotal : 0;
  const money = (c: number) => formatMoney(c, doc.currency || "DZD");
  const set = onCompany ?? (() => {});
  const ed = editable && Boolean(onCompany);
  const terms = isQuote ? company.quoteTerms : company.invoiceTerms;

  const setLine = (i: number, patch: Partial<PreviewLine>) => {
    const lines = doc.lines.map((l, j) => (j === i ? { ...l, ...patch } : l));
    onDoc?.({ lines });
  };

  return (
    <div ref={box} className="w-full" style={{ height: height * scale }}>
      <div
        ref={page}
        style={{ width: PAGE_W, transform: `scale(${scale})`, transformOrigin: "top left" }}
        className="min-h-[1123px] bg-white px-[58px] pb-[120px] pt-[58px] text-[12.5px] leading-snug text-ink shadow-[0_1px_3px_rgba(38,51,76,0.12),0_12px_32px_-12px_rgba(38,51,76,0.25)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div>
            {company.logoAttachmentId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/uploads?id=${company.logoAttachmentId}&inline=1`}
                alt="Logo"
                className="max-h-[74px] max-w-[200px] object-contain"
              />
            ) : (
              <p className="text-[24px] font-bold text-abyss">
                <E value={company.name} onChange={(v) => set("name", v)} placeholder="Raison sociale" editable={ed} />
              </p>
            )}
          </div>
          <div className="flex max-w-[300px] flex-col items-end gap-0.5 text-right text-[#5d6b85]">
            {company.logoAttachmentId && (
              <p className="text-[14px] font-bold text-ink">
                <E value={company.name} onChange={(v) => set("name", v)} placeholder="Raison sociale" editable={ed} />
              </p>
            )}
            <E value={company.address} onChange={(v) => set("address", v)} placeholder="Adresse" editable={ed} />
            <span>
              <E value={company.city} onChange={(v) => set("city", v)} placeholder="Ville" editable={ed} />
              {(company.city || ed) && (company.country || ed) ? ", " : ""}
              <E value={company.country} onChange={(v) => set("country", v)} placeholder="Pays" editable={ed} />
            </span>
            <span className="flex flex-wrap justify-end gap-x-2">
              <E value={company.phone} onChange={(v) => set("phone", v)} placeholder="Téléphone" editable={ed} />
              <E value={company.email} onChange={(v) => set("email", v)} placeholder="E-mail" editable={ed} />
              <E value={company.website} onChange={(v) => set("website", v)} placeholder="Site web" editable={ed} />
            </span>
          </div>
        </div>

        {/* Title band */}
        <div className="mt-9 flex items-end justify-between">
          <div>
            <p className="text-[32px] font-bold leading-none tracking-wide text-abyss">{isQuote ? "DEVIS" : "FACTURE"}</p>
            <p className="mt-1.5 text-[14px] font-bold text-teal-deep">{doc.ref}</p>
            <div className="mt-3 h-[3px] w-[75px] bg-signal" />
          </div>
          <div className="text-right text-[#5d6b85]">
            <p>
              Date : <span className="text-ink">{DATE.format(doc.date)}</span>
            </p>
            {doc.dueAt && (
              <p>
                {isQuote ? "Valable jusqu'au : " : "Échéance : "}
                <span className="text-ink">{DATE.format(new Date(doc.dueAt))}</span>
              </p>
            )}
            {doc.sourceRef && (
              <p>
                Devis : <span className="text-ink">{doc.sourceRef}</span>
              </p>
            )}
          </div>
        </div>

        {/* Parties */}
        <div className="mt-7 grid grid-cols-2 gap-5">
          <div className="flex flex-col gap-0.5 rounded-lg bg-mist p-4">
            <p className="mb-1 text-[10px] font-bold tracking-[0.12em] text-[#5d6b85]">ÉMETTEUR</p>
            <p className="text-[14px] font-bold">{company.name}</p>
            {company.address && <p>{company.address}</p>}
            {(company.city || company.country) && <p>{[company.city, company.country].filter(Boolean).join(", ")}</p>}
            {company.email && <p>{company.email}</p>}
          </div>
          <div className="flex flex-col gap-0.5 rounded-lg bg-mist p-4">
            <p className="mb-1 text-[10px] font-bold tracking-[0.12em] text-[#5d6b85]">{isQuote ? "DESTINATAIRE" : "FACTURÉ À"}</p>
            {doc.client ? (
              <>
                <p className="text-[14px] font-bold">{doc.client.company || doc.client.name}</p>
                {doc.client.company && <p>{doc.client.name}</p>}
                <p>{doc.client.email}</p>
                {doc.client.phone && <p>{doc.client.phone}</p>}
              </>
            ) : (
              <p className="text-[#8a94a8]">Choisissez un client</p>
            )}
          </div>
        </div>

        {/* Subject */}
        <p className="mt-6 text-[14.5px] font-bold">
          Objet :{" "}
          <E value={doc.title} onChange={(v) => onDoc?.({ title: v })} placeholder="Intitulé" editable={editable} />
        </p>

        {/* Lines */}
        <table className="mt-4 w-full border-separate border-spacing-0">
          <thead>
            <tr className="text-[11px] font-bold text-white">
              <th className="rounded-l-md bg-abyss px-3 py-2.5 text-left">Désignation</th>
              <th className="w-16 bg-abyss px-3 py-2.5 text-right">Qté</th>
              <th className="w-32 bg-abyss px-3 py-2.5 text-right">P.U. HT</th>
              <th className="w-32 rounded-r-md bg-abyss px-3 py-2.5 text-right">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l, i) => (
              <tr key={i}>
                <td className="border-b border-[#D5DCE5] px-3 py-2.5">
                  <E value={l.label} onChange={(v) => setLine(i, { label: v })} placeholder="Désignation" editable={editable} />
                </td>
                <td className="border-b border-[#D5DCE5] px-3 py-2.5 text-right tabular-nums">
                  <E value={l.quantity} onChange={(v) => setLine(i, { quantity: v })} placeholder="1" editable={editable} align="right" />
                </td>
                <td className="border-b border-[#D5DCE5] px-3 py-2.5 text-right tabular-nums">
                  {editable ? (
                    <E value={l.unit} onChange={(v) => setLine(i, { unit: v })} placeholder="0" editable align="right" />
                  ) : (
                    money(parseMoneyToCents(l.unit || "0") ?? 0)
                  )}
                </td>
                <td className="border-b border-[#D5DCE5] px-3 py-2.5 text-right tabular-nums">{money(lineCents(l))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {editable && (
          <button
            type="button"
            onClick={() => onDoc?.({ lines: [...doc.lines, { label: "", quantity: "1", unit: "" }] })}
            className="mt-2 rounded-md px-2 py-1 text-[11px] font-bold text-teal-deep hover:bg-mist"
          >
            + Ajouter une ligne
          </button>
        )}

        {/* Totals */}
        <div className="ml-auto mt-4 w-[315px]">
          {(vat > 0 || ed) && (
            <>
              <p className="flex justify-between py-1">
                <span>Total HT</span>
                <span className="tabular-nums">{money(subtotal)}</span>
              </p>
              <p className="flex justify-between py-1">
                <span>
                  TVA{" "}
                  <E
                    value={String(company.vatRate)}
                    onChange={(v) => {
                      const n = Number(v.replace(",", ".").replace("%", "").trim());
                      if (Number.isFinite(n) && n >= 0 && n <= 100) set("vatRate", n);
                    }}
                    editable={ed}
                  />{" "}
                  %
                </span>
                <span className="tabular-nums">{money(vat)}</span>
              </p>
            </>
          )}
          <p className="mt-1 flex justify-between rounded-md bg-abyss px-3.5 py-2.5 text-[14.5px] font-bold text-white">
            <span>{vat > 0 ? "Total TTC" : "Total"}</span>
            <span className="tabular-nums">{money(subtotal + vat)}</span>
          </p>
        </div>

        {/* Remarks */}
        {(doc.note || editable) && (
          <div className="mt-7">
            <p className="mb-1 font-bold">Remarques</p>
            <E value={doc.note} onChange={(v) => onDoc?.({ note: v })} placeholder="Délais, conditions particulières…" multiline editable={editable} className="block" />
          </div>
        )}

        {/* Terms + signature */}
        <div className="mt-8 flex items-start justify-between gap-8">
          <div className="flex-1 text-[11px] text-[#5d6b85]">
            <E
              value={terms}
              onChange={(v) => set(isQuote ? "quoteTerms" : "invoiceTerms", v)}
              placeholder="Conditions générales"
              multiline
              editable={ed}
              className="block"
            />
            {!isQuote && (company.bank || company.rib) && (
              <p className="mt-2">Règlement : {[company.bank, company.rib && `RIB ${company.rib}`].filter(Boolean).join("  ·  ")}</p>
            )}
            {isQuote && <p className="mt-3">Bon pour accord — date et signature du client :</p>}
          </div>
          <div className="flex w-[250px] flex-col items-center">
            <p className="mb-2 text-[10px] font-bold tracking-[0.12em] text-[#5d6b85]">POUR {company.name.toUpperCase()}</p>
            {company.signatureAttachmentId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/uploads?id=${company.signatureAttachmentId}&inline=1`} alt="Signature" className="mb-1 max-h-[92px] max-w-[225px] object-contain" />
            ) : (
              <div className="h-16" />
            )}
            <div className="flex w-[225px] flex-col items-center border-t border-ink pt-1.5">
              <p className="font-bold">
                <E value={company.signatoryName} onChange={(v) => set("signatoryName", v)} placeholder="Signataire" editable={ed} />
              </p>
              <p className="text-[#5d6b85]">
                <E value={company.signatoryTitle} onChange={(v) => set("signatoryTitle", v)} placeholder="Fonction" editable={ed} />
              </p>
            </div>
          </div>
        </div>

        {/* Legal footer — each identifier editable */}
        <div className="mt-14 flex flex-col items-center gap-1 border-t border-[#D5DCE5] pt-3 text-center text-[10px] text-[#5d6b85]">
          <p className="flex flex-wrap justify-center gap-x-3 gap-y-0.5">
            <span>
              <E value={company.legalForm} onChange={(v) => set("legalForm", v)} placeholder="Forme" editable={ed} />
              {(company.capital || ed) && (
                <>
                  {" "}au capital de{" "}
                  <E value={company.capital} onChange={(v) => set("capital", v)} placeholder="capital" editable={ed} />
                </>
              )}
            </span>
            {(["rc", "nif", "nis", "ai"] as const).map((k) =>
              company[k] || ed ? (
                <span key={k}>
                  {k.toUpperCase()}{" "}
                  <E value={company[k]} onChange={(v) => set(k, v)} placeholder="—" editable={ed} />
                </span>
              ) : null,
            )}
          </p>
          <p className="flex flex-wrap justify-center gap-x-3">
            <E value={company.bank} onChange={(v) => set("bank", v)} placeholder="Banque" editable={ed} />
            {(company.rib || ed) && (
              <span>
                RIB <E value={company.rib} onChange={(v) => set("rib", v)} placeholder="—" editable={ed} />
              </span>
            )}
          </p>
          <E value={company.footerNote} onChange={(v) => set("footerNote", v)} placeholder="Pied de page" editable={ed} />
          <p className="mt-1 self-end">{doc.ref} — 1 / 1</p>
        </div>
      </div>
    </div>
  );
}
