"use client";

import { useActionState, useMemo, useState, type ReactNode } from "react";
import { Button } from "@heroui/react";
import { FormAlert, SubmitButton } from "@/components/dashboard/ui";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { IDLE, type ActionState } from "@/lib/actions";
import {
  effectiveCompany,
  type CompanyIdentity,
  type CompanyOverrides,
} from "@/lib/company";
import { formatMoney, withVat } from "@/lib/money";
import { saveQuote } from "@/app/(app)/admin/devis/actions";
import { saveInvoice } from "@/app/(app)/admin/factures/actions";
import { DocumentPreview, previewTotal, type PreviewLine } from "./DocumentPreview";
import { ImagePicker } from "./ImagePicker";

/**
 * The devis / facture editor: the form on the left, the document on the right.
 *
 * One state drives both, so typing in either updates the other. Everything the
 * PDF prints can be changed here, **including the company identity** — legal
 * IDs, bank, VAT, signature, logo, terms. Those edits are this document's
 * *overrides*, stored on the row (`quotes.overrides` / `invoices.overrides`):
 * the Paramètres identity is never touched, a field left alone keeps following
 * Paramètres, and "Par défaut" puts a field back.
 *
 * Posts the same fields the save actions always read — `label[]` /
 * `quantity[]` / `unitCents[]` for the lines, re-summed on the server — plus
 * one `overrides` JSON input, validated there against `CompanyOverridesSchema`.
 */

export type EditorClient = { id: string; name: string; email: string; company: string | null; phone: string | null };

type Tab = "document" | "emetteur" | "mentions";

const IDENTITY_FIELDS: { key: keyof CompanyIdentity; label: string; wide?: boolean }[] = [
  { key: "name", label: "Raison sociale", wide: true },
  { key: "legalForm", label: "Forme juridique" },
  { key: "capital", label: "Capital" },
  { key: "address", label: "Adresse", wide: true },
  { key: "city", label: "Ville" },
  { key: "country", label: "Pays" },
  { key: "phone", label: "Téléphone" },
  { key: "email", label: "E-mail" },
  { key: "website", label: "Site web", wide: true },
];
const LEGAL_FIELDS: { key: keyof CompanyIdentity; label: string }[] = [
  { key: "rc", label: "RC" },
  { key: "nif", label: "NIF" },
  { key: "nis", label: "NIS" },
  { key: "ai", label: "Article d'imposition (AI)" },
  { key: "bank", label: "Banque" },
  { key: "rib", label: "RIB" },
];

const EMITTER_KEYS = new Set<keyof CompanyIdentity>([
  ...IDENTITY_FIELDS.map((f) => f.key),
  ...LEGAL_FIELDS.map((f) => f.key),
  "vatRate",
]);

const input =
  "w-full rounded-2xl bg-soft px-3 py-2.5 text-sm text-fg placeholder:text-fg/80 focus:outline-none focus:ring-2 focus:ring-fg";

export function DocumentEditor({
  kind,
  docId,
  docRef,
  sourceRef,
  issuedAt,
  clients,
  defaultUserId,
  requestId,
  requestLabel,
  title: initialTitle = "",
  note: initialNote = "",
  date: initialDate = "",
  currency: initialCurrency = "DZD",
  lines: initialLines,
  company,
  overrides: initialOverrides = {},
  storage,
}: {
  kind: "quote" | "invoice";
  docId?: number;
  docRef?: string;
  sourceRef?: string | null;
  issuedAt?: string;
  clients: EditorClient[];
  defaultUserId?: string;
  requestId?: number;
  requestLabel?: string;
  title?: string;
  note?: string | null;
  /** Devis: valid until. Facture: due date. yyyy-mm-dd. */
  date?: string;
  currency?: string;
  lines?: { label: string; quantity: number; unitCents: number }[];
  /** The Paramètres identity — what an unoverridden field shows. */
  company: CompanyIdentity;
  overrides?: CompanyOverrides;
  storage: boolean;
}) {
  const isQuote = kind === "quote";
  const [state, action] = useActionState<ActionState, FormData>(isQuote ? saveQuote : saveInvoice, IDLE);
  const [tab, setTab] = useState<Tab>("document");

  const [userId, setUserId] = useState(defaultUserId ?? "");
  const [title, setTitle] = useState(initialTitle);
  const [note, setNote] = useState(initialNote ?? "");
  const [date, setDate] = useState(initialDate);
  const [currency, setCurrency] = useState(initialCurrency);
  const [lines, setLines] = useState<PreviewLine[]>(() =>
    (initialLines?.length ? initialLines : [{ label: "", quantity: 1, unitCents: 0 }]).map((l) => ({
      label: l.label,
      quantity: String(l.quantity),
      unit: l.unitCents ? String(l.unitCents / 100).replace(".", ",") : "",
    })),
  );
  const [overrides, setOverrides] = useState<CompanyOverrides>(initialOverrides);

  const effective = useMemo(() => effectiveCompany(company, overrides), [company, overrides]);
  const overridden = Object.keys(overrides).filter(
    (k) => overrides[k as keyof CompanyIdentity] !== undefined,
  ) as (keyof CompanyIdentity)[];

  function setOverride<K extends keyof CompanyIdentity>(key: K, value: CompanyIdentity[K]) {
    setOverrides((cur) => {
      const next = { ...cur };
      // Typing the Paramètres value back in is the same as not overriding.
      if (value === company[key]) delete next[key];
      else next[key] = value;
      return next;
    });
  }
  function reset(key: keyof CompanyIdentity) {
    setOverrides((cur) => {
      const next = { ...cur };
      delete next[key];
      return next;
    });
  }

  const client = clients.find((c) => c.id === userId) ?? null;
  const subtotal = previewTotal(lines);
  const termsKey = isQuote ? "quoteTerms" : "invoiceTerms";

  const ctx: Ctx = { overrides, effective, company, setOverride, reset };

  return (
    <form action={action} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* What the save actions read. */}
      {docId && <input type="hidden" name={isQuote ? "quoteId" : "invoiceId"} value={docId} />}
      {requestId && <input type="hidden" name="requestId" value={requestId} />}
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="title" value={title} />
      <input type="hidden" name="note" value={note} />
      <input type="hidden" name={isQuote ? "validUntil" : "dueAt"} value={date} />
      <input type="hidden" name="currency" value={currency} />
      {lines.map((l, i) => (
        <span key={i} hidden>
          <input type="hidden" name="label" value={l.label} />
          <input type="hidden" name="quantity" value={l.quantity} />
          <input type="hidden" name="unitCents" value={l.unit} />
        </span>
      ))}
      <input type="hidden" name="overrides" value={JSON.stringify(overrides)} />

      {/* ───────────── Left: the form ───────────── */}
      <div className="flex min-w-0 flex-col gap-5">
        <FormAlert state={state} />

        <div role="tablist" className="flex gap-1 rounded-full bg-soft p-1">
          {(
            [
              ["document", "Document"],
              ["emetteur", `Émetteur${overridden.some((k) => EMITTER_KEYS.has(k)) ? " •" : ""}`],
              ["mentions", "Mentions & signature"],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-sm font-[650] transition-colors",
                tab === id ? "bg-fg text-on-fg" : "text-fg hover:bg-fg/8",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {overridden.length > 0 && (
          <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-soft px-4 py-3 text-sm text-fg">
            <Icon name="settings" className="size-4" />
            {overridden.length} information{overridden.length > 1 ? "s" : ""} de l&apos;émetteur propre
            {overridden.length > 1 ? "s" : ""} à ce document — les Paramètres ne changent pas.
            <button type="button" onClick={() => setOverrides({})} className="font-[650] underline underline-offset-2">
              Tout remettre par défaut
            </button>
          </p>
        )}

        {tab === "document" && (
          <Section>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-fg">Client</span>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} required className={input}>
                <option value="">— Choisir un client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.email}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.userId && <span className="text-xs text-fg">{state.fieldErrors.userId}</span>}
            </label>
            {requestLabel && (
              <p className="text-sm text-fg/80">
                Rattaché à la demande <strong className="font-[650] text-fg">{requestLabel}</strong>.
              </p>
            )}
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-fg">Intitulé</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="Intégration OCR — phase 1" className={input} />
              {state.fieldErrors?.title && <span className="text-xs text-fg">{state.fieldErrors.title}</span>}
            </label>
            <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-fg">{isQuote ? "Valable jusqu'au" : "Échéance"}</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm text-fg">Devise</span>
                <input value={currency} maxLength={3} onChange={(e) => setCurrency(e.target.value.toUpperCase())} className={cn(input, "font-mono")} />
              </label>
            </div>

            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-sm font-[650] text-fg">Lignes (hors taxes)</legend>
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_4.5rem_7rem_auto] items-end gap-2">
                  <input
                    aria-label={`Désignation ligne ${i + 1}`}
                    value={l.label}
                    onChange={(e) => setLines((all) => all.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
                    placeholder="Prestation"
                    className={input}
                  />
                  <input
                    aria-label={`Quantité ligne ${i + 1}`}
                    inputMode="decimal"
                    value={l.quantity}
                    onChange={(e) => setLines((all) => all.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                    className={cn(input, "text-right tabular-nums")}
                  />
                  <input
                    aria-label={`Prix unitaire ligne ${i + 1}`}
                    inputMode="decimal"
                    value={l.unit}
                    onChange={(e) => setLines((all) => all.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))}
                    placeholder="0"
                    className={cn(input, "text-right tabular-nums")}
                  />
                  <Button
                    variant="danger-soft"
                    isIconOnly
                    aria-label={`Supprimer la ligne ${i + 1}`}
                    isDisabled={lines.length === 1}
                    onPress={() => setLines((all) => all.filter((_, j) => j !== i))}
                  >
                    <Icon name="trash" className="size-4 text-danger-fg" />
                  </Button>
                </div>
              ))}
              <Button variant="ghost" className="self-start" onPress={() => setLines((all) => [...all, { label: "", quantity: "1", unit: "" }])}>
                <Icon name="plus" className="size-4" />
                Ajouter une ligne
              </Button>
            </fieldset>

            <p className="flex items-baseline justify-between border-t border-fg/10 pt-4 text-sm">
              <span className="text-fg/80">{effective.vatRate > 0 ? "Total TTC" : "Total"}</span>
              <span className="text-xl font-[650] tabular-nums text-fg">
                {formatMoney(withVat(subtotal, effective.vatRate), currency || "DZD")}
              </span>
            </p>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-fg">{isQuote ? "Note au client" : "Remarques"}</span>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={input} placeholder="Délais, conditions particulières…" />
            </label>
          </Section>
        )}

        {tab === "emetteur" && (
          <Section hint="Chaque champ suit les Paramètres tant que vous ne le modifiez pas. Modifié, il ne vaut que pour ce document.">
            <div className="grid gap-4 sm:grid-cols-2">
              {IDENTITY_FIELDS.map((f) => (
                <IdentityInput key={f.key} ctx={ctx} k={f.key} label={f.label} wide={f.wide} />
              ))}
            </div>
            <p className="mt-2 text-sm font-[650] text-fg">Identifiants légaux et bancaires</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {LEGAL_FIELDS.map((f) => (
                <IdentityInput key={f.key} ctx={ctx} k={f.key} label={f.label} mono />
              ))}
              <label className="flex flex-col gap-1.5">
                <span className="flex items-center justify-between text-sm text-fg">
                  <span>
                    TVA (%)
                    {overrides.vatRate !== undefined && (
                      <span className="ml-2 rounded-full bg-signal/15 px-2 py-0.5 text-[11px] font-[650] text-fg ring-1 ring-signal/45">ce document</span>
                    )}
                  </span>
                  {overrides.vatRate !== undefined && (
                    <button type="button" onClick={() => reset("vatRate")} className="text-xs font-[650] text-fg hover:underline">
                      Par défaut
                    </button>
                  )}
                </span>
                <input
                  inputMode="decimal"
                  value={String(effective.vatRate)}
                  onChange={(e) => {
                    const n = Number(e.target.value.replace(",", "."));
                    if (e.target.value === "") setOverride("vatRate", 0);
                    else if (Number.isFinite(n) && n >= 0 && n <= 100) setOverride("vatRate", n);
                  }}
                  className={cn(input, "tabular-nums", overrides.vatRate !== undefined && "ring-1 ring-signal/55")}
                />
              </label>
            </div>
          </Section>
        )}

        {tab === "mentions" && (
          <Section>
            <div className="grid gap-5 sm:grid-cols-2">
              <ImagePicker
                label="Logo"
                value={effective.logoAttachmentId}
                onChange={(id) => setOverride("logoAttachmentId", id)}
                onReset={overrides.logoAttachmentId !== undefined ? () => reset("logoAttachmentId") : undefined}
                storage={storage}
              />
              <ImagePicker
                label="Signature / cachet"
                value={effective.signatureAttachmentId}
                onChange={(id) => setOverride("signatureAttachmentId", id)}
                onReset={overrides.signatureAttachmentId !== undefined ? () => reset("signatureAttachmentId") : undefined}
                storage={storage}
              />
              <IdentityInput ctx={ctx} k="signatoryName" label="Signataire" />
              <IdentityInput ctx={ctx} k="signatoryTitle" label="Fonction" />
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="flex items-center justify-between text-sm text-fg">
                <span>{isQuote ? "Conditions du devis" : "Conditions de la facture"}</span>
                {overrides[termsKey] !== undefined && (
                  <button type="button" onClick={() => reset(termsKey)} className="text-xs font-[650] text-fg hover:underline">
                    Par défaut
                  </button>
                )}
              </span>
              <textarea
                rows={4}
                value={effective[termsKey]}
                onChange={(e) => setOverride(termsKey, e.target.value)}
                className={cn(input, overrides[termsKey] !== undefined && "ring-1 ring-signal/55")}
              />
            </label>
            <IdentityInput ctx={ctx} k="footerNote" label="Pied de page" wide />
          </Section>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-fg/10 pt-5">
          <SubmitButton>
            {isQuote ? (docId ? "Enregistrer le devis" : "Créer le devis") : docId ? "Enregistrer la facture" : "Créer la facture"}
          </SubmitButton>
          {docId && (
            <a
              href={`/api/documents/${isQuote ? "devis" : "facture"}/${docId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-[650] text-fg underline underline-offset-4"
            >
              Aperçu PDF exact (dernière version enregistrée)
            </a>
          )}
        </div>
      </div>

      {/* ───────────── Right: the document ───────────── */}
      <div className="min-w-0">
        <div className="xl:sticky xl:top-24">
          <p className="mb-3 flex items-center gap-2 text-xs text-fg/80">
            <Icon name="file-text" className="size-3.5" />
            Aperçu — cliquez sur un texte pour le modifier directement
          </p>
          <div className="rounded-3xl bg-soft p-4 sm:p-6">
            <DocumentPreview
              doc={{
                kind,
                ref: docRef ?? (isQuote ? "DV-…" : "FA-…"),
                title,
                note,
                date: issuedAt ? new Date(issuedAt) : new Date(),
                dueAt: date,
                currency,
                lines,
                client,
                sourceRef,
              }}
              company={effective}
              editable
              onDoc={(patch) => {
                if (patch.title !== undefined) setTitle(patch.title);
                if (patch.note !== undefined) setNote(patch.note);
                if (patch.lines) setLines(patch.lines);
              }}
              onCompany={setOverride}
            />
          </div>
        </div>
      </div>
    </form>
  );
}

function Section({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-4">
      {hint && <p className="text-sm text-fg/80">{hint}</p>}
      {children}
    </div>
  );
}

type Ctx = {
  overrides: CompanyOverrides;
  effective: CompanyIdentity;
  company: CompanyIdentity;
  setOverride: <K extends keyof CompanyIdentity>(key: K, value: CompanyIdentity[K]) => void;
  reset: (key: keyof CompanyIdentity) => void;
};

/**
 * One company field. Module-level on purpose: declared inside the editor it
 * would be a new component on every render, and React would remount the
 * input — losing focus — on every keystroke.
 */
function IdentityInput({
  ctx,
  k,
  label,
  wide,
  mono,
}: {
  ctx: Ctx;
  k: keyof CompanyIdentity;
  label: string;
  wide?: boolean;
  mono?: boolean;
}) {
  const isOver = ctx.overrides[k] !== undefined;
  return (
    <label className={cn("flex flex-col gap-1.5", wide && "sm:col-span-2")}>
      <span className="flex items-center justify-between gap-2 text-sm text-fg">
        <span>
          {label}
          {isOver && (
            <span className="ml-2 rounded-full bg-signal/15 px-2 py-0.5 text-[11px] font-[650] text-fg ring-1 ring-signal/45">
              ce document
            </span>
          )}
        </span>
        {isOver && (
          <button type="button" onClick={() => ctx.reset(k)} className="text-xs font-[650] text-fg underline-offset-2 hover:underline">
            Par défaut
          </button>
        )}
      </span>
      <input
        value={String(ctx.effective[k] ?? "")}
        onChange={(e) => ctx.setOverride(k, e.target.value as never)}
        placeholder={String(ctx.company[k] ?? "") || "—"}
        className={cn(input, mono && "font-mono", isOver && "ring-1 ring-signal/55")}
      />
    </label>
  );
}
