"use client";

import { useActionState, useState } from "react";
import { Button } from "@heroui/react";
import {
  Field,
  FormAlert,
  SelectField,
  SubmitButton,
  TextAreaField,
  type Option,
} from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import { formatMoney } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";
import { saveQuote } from "./actions";
import { saveInvoice } from "../factures/actions";

type DraftLine = { key: number; label: string; quantity: string; unit: string };

/**
 * The line-item editor for quotes **and** invoices (`kind`) — one form for both
 * "nouveau" and "modifier", so the two documents can never drift in how they
 * are written.
 *
 * Line items are a repeated fieldset posting three parallel arrays
 * (`label[]`, `quantity[]`, `unitCents[]`); the action zips them and **re-sums
 * the total server-side**. The running total shown here is a convenience for the
 * person typing, not the figure that gets stored — so a tampered hidden input
 * cannot change what the client is billed.
 *
 * Prices are entered in whole currency units and converted to cents on the
 * server. The input is `inputMode="decimal"` rather than `type="number"`: a
 * number input silently swallows a comma on a French keyboard, which is exactly
 * how a 1 250,50 becomes a 1 250.
 */
export function QuoteEditor({
  kind = "quote",
  quoteId,
  clients,
  defaultUserId,
  requestId,
  requestLabel,
  title,
  note,
  validUntil,
  currency = "DZD",
  lines: initialLines,
}: {
  kind?: "quote" | "invoice";
  /** The row being edited — a quote id or an invoice id, depending on `kind`. */
  quoteId?: number;
  clients: Option[];
  defaultUserId?: string;
  requestId?: number;
  requestLabel?: string;
  title?: string;
  note?: string | null;
  validUntil?: string;
  currency?: string;
  lines?: { label: string; quantity: number; unitCents: number }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    kind === "quote" ? saveQuote : saveInvoice,
    IDLE,
  );
  const isQuote = kind === "quote";
  const [lines, setLines] = useState<DraftLine[]>(() =>
    (initialLines?.length ? initialLines : [{ label: "", quantity: 1, unitCents: 0 }]).map(
      (l, i) => ({
        key: i,
        label: l.label,
        quantity: String(l.quantity),
        unit: l.unitCents ? String(l.unitCents / 100) : "",
      }),
    ),
  );

  const total = lines.reduce(
    (sum, l) => sum + Math.round((Number(l.quantity) || 0) * (Number(l.unit) || 0) * 100),
    0,
  );

  function update(key: number, patch: Partial<DraftLine>) {
    setLines((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <form action={action} className="flex flex-col gap-6">
      {quoteId && <input type="hidden" name={isQuote ? "quoteId" : "invoiceId"} value={quoteId} />}
      {requestId && <input type="hidden" name="requestId" value={requestId} />}
      <input type="hidden" name="currency" value={currency} />

      <FormAlert state={state} />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          name="userId"
          label="Client"
          options={clients}
          defaultValue={state.values?.userId ?? defaultUserId}
          error={state.fieldErrors?.userId}
          isRequired
        />
        <Field
          name={isQuote ? "validUntil" : "dueAt"}
          label={isQuote ? "Valable jusqu'au" : "Échéance"}
          type="date"
          defaultValue={(isQuote ? state.values?.validUntil : state.values?.dueAt) ?? validUntil ?? ""}
          description="Facultatif."
        />
      </div>

      <Field
        name="title"
        label="Intitulé"
        placeholder="Intégration OCR — phase 1"
        defaultValue={state.values?.title ?? title}
        error={state.fieldErrors?.title}
        isRequired
      />

      {requestLabel && (
        <p className="text-sm text-fg/80">
          Rattaché à la demande <strong className="font-[650] text-fg">{requestLabel}</strong>.
        </p>
      )}

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-[650] text-fg">Lignes</legend>

        {lines.map((line, index) => (
          <div key={line.key} className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-[14rem] flex-1 flex-col gap-1.5">
              <span className="text-sm text-fg/80">Désignation</span>
              <input
                name="label"
                value={line.label}
                onChange={(e) => update(line.key, { label: e.target.value })}
                placeholder="Prestation"
                className="rounded-2xl bg-soft px-3 py-2.5 text-sm text-fg placeholder:text-fg/80 focus:outline-none focus:ring-2 focus:ring-fg"
              />
            </label>
            <label className="flex w-24 flex-col gap-1.5">
              <span className="text-sm text-fg/80">Qté</span>
              <input
                name="quantity"
                inputMode="decimal"
                value={line.quantity}
                onChange={(e) => update(line.key, { quantity: e.target.value })}
                className="rounded-2xl bg-soft px-3 py-2.5 text-right text-sm tabular-nums text-fg focus:outline-none focus:ring-2 focus:ring-fg"
              />
            </label>
            <label className="flex w-36 flex-col gap-1.5">
              <span className="text-sm text-fg/80">P.U. ({currency})</span>
              <input
                name="unitCents"
                inputMode="decimal"
                value={line.unit}
                onChange={(e) => update(line.key, { unit: e.target.value })}
                placeholder="0"
                className="rounded-2xl bg-soft px-3 py-2.5 text-right text-sm tabular-nums text-fg placeholder:text-fg/80 focus:outline-none focus:ring-2 focus:ring-fg"
              />
            </label>
            <Button
              variant="ghost"
              isIconOnly
              aria-label={`Supprimer la ligne ${index + 1}`}
              isDisabled={lines.length === 1}
              onPress={() => setLines((rows) => rows.filter((r) => r.key !== line.key))}
            >
              <Icon name="trash" className="size-4" />
            </Button>
          </div>
        ))}

        <Button
          variant="ghost"
          className="self-start"
          onPress={() =>
            setLines((rows) => [
              ...rows,
              { key: Math.max(0, ...rows.map((r) => r.key)) + 1, label: "", quantity: "1", unit: "" },
            ])
          }
        >
          <Icon name="plus" className="size-4" />
          Ajouter une ligne
        </Button>
      </fieldset>

      <p className="flex items-baseline justify-between border-t border-fg/10 pt-4 text-sm">
        <span className="text-fg/80">Total</span>
        <span className="text-xl font-[650] tabular-nums text-fg">
          {formatMoney(total, currency)}
        </span>
      </p>

      <TextAreaField
        name="note"
        label={isQuote ? "Note au client" : "Remarques"}
        description="Conditions, délais, précisions — affiché sous le détail."
        defaultValue={state.values?.note ?? note ?? ""}
        rows={4}
      />

      <SubmitButton className="self-start">
        {isQuote
          ? quoteId
            ? "Enregistrer le devis"
            : "Créer le devis"
          : quoteId
            ? "Enregistrer la facture"
            : "Créer la facture"}
      </SubmitButton>
    </form>
  );
}
