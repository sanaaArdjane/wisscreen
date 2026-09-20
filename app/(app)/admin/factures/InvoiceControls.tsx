"use client";

import { useActionState } from "react";
import { Field, FormAlert, SelectField, SubmitButton } from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import { INVOICE_LABELS, INVOICE_STATUSES } from "@/lib/billing";
import { setInvoiceStatus } from "./actions";

export function InvoiceControls({
  invoiceId,
  status,
  dueAt,
}: {
  invoiceId: number;
  status: string;
  dueAt: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(setInvoiceStatus, IDLE);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <SelectField
        name="status"
        label="Statut"
        options={INVOICE_STATUSES.map((s) => ({ value: s, label: INVOICE_LABELS[s] }))}
        defaultValue={status}
        className="w-52"
        isRequired
      />
      <Field name="dueAt" label="Échéance" type="date" defaultValue={dueAt} className="w-48" />
      <SubmitButton variant="secondary">Appliquer</SubmitButton>
      {state.message && <p className="w-full text-sm text-ink/80">{state.message}</p>}
      <div className="w-full">
        <FormAlert state={state.ok ? {} : state} />
      </div>
    </form>
  );
}
