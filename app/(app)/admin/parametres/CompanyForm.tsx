"use client";

import { useActionState, useState } from "react";
import { Field, FormAlert, SubmitButton, TextAreaField } from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import type { CompanyIdentity } from "@/lib/settings";
import { ImagePicker } from "@/components/dashboard/billing/ImagePicker";
import { updateCompany } from "./actions";

/**
 * The header, footer and signature of every devis and facture PDF.
 *
 * Fields left blank are simply not printed — the document is built to read
 * correctly with nothing filled in but the name, so the admin can start
 * sending quotes before the paperwork is all collected.
 */
export function CompanyForm({ company, storage }: { company: CompanyIdentity; storage: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(updateCompany, IDLE);
  const v = state.values ?? {};
  const f = (name: keyof CompanyIdentity) => (v[name] ?? String(company[name] ?? "")) as string;

  return (
    <form action={action} className="flex flex-col gap-8">
      <FormAlert state={state} />

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-[650] text-fg">En-tête</legend>
        <Field name="name" label="Raison sociale" defaultValue={f("name")} error={state.fieldErrors?.name} isRequired />
        <div className="grid grid-cols-2 gap-3">
          <Field name="legalForm" label="Forme juridique" placeholder="SARL, EURL, SPA…" defaultValue={f("legalForm")} />
          <Field name="capital" label="Capital" placeholder="1 000 000 DZD" defaultValue={f("capital")} />
        </div>
        <Field name="address" label="Adresse" defaultValue={f("address")} className="sm:col-span-2" />
        <Field name="city" label="Ville" defaultValue={f("city")} />
        <Field name="country" label="Pays" defaultValue={f("country")} />
        <Field name="phone" label="Téléphone" type="tel" defaultValue={f("phone")} />
        <Field name="email" label="E-mail" type="email" defaultValue={f("email")} error={state.fieldErrors?.email} />
        <Field name="website" label="Site web" defaultValue={f("website")} className="sm:col-span-2" />
      </fieldset>

      <fieldset className="grid gap-5 border-t border-fg/10 pt-6 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-[650] text-fg">Identifiants légaux et bancaires</legend>
        <Field name="rc" label="RC (registre du commerce)" defaultValue={f("rc")} />
        <Field name="nif" label="NIF" defaultValue={f("nif")} />
        <Field name="nis" label="NIS" defaultValue={f("nis")} />
        <Field name="ai" label="Article d'imposition (AI)" defaultValue={f("ai")} />
        <Field name="bank" label="Banque" defaultValue={f("bank")} />
        <Field name="rib" label="RIB" defaultValue={f("rib")} />
        <Field
          name="vatRate"
          label="TVA (%)"
          inputMode="decimal"
          defaultValue={f("vatRate")}
          error={state.fieldErrors?.vatRate}
          description="0 = pas de ligne de TVA. Les prix saisis sur les devis sont hors taxes."
        />
      </fieldset>

      <fieldset className="grid gap-5 border-t border-fg/10 pt-6 sm:grid-cols-2">
        <legend className="mb-3 text-sm font-[650] text-fg">Logo et signature</legend>
        <StatefulPicker
          name="logoAttachmentId"
          label="Logo"
          hint="PNG ou JPEG, fond transparent ou blanc. Affiché en haut à gauche."
          initialId={company.logoAttachmentId}
          storage={storage}
        />
        <StatefulPicker
          name="signatureAttachmentId"
          label="Signature / cachet"
          hint="PNG ou JPEG. Affichée au-dessus du nom du signataire."
          initialId={company.signatureAttachmentId}
          storage={storage}
        />
        <Field name="signatoryName" label="Signataire" defaultValue={f("signatoryName")} placeholder="Nom Prénom" />
        <Field name="signatoryTitle" label="Fonction" defaultValue={f("signatoryTitle")} placeholder="Gérant" />
      </fieldset>

      <fieldset className="grid gap-5 border-t border-fg/10 pt-6">
        <legend className="mb-3 text-sm font-[650] text-fg">Mentions</legend>
        <TextAreaField name="quoteTerms" label="Conditions des devis" defaultValue={f("quoteTerms")} rows={3} />
        <TextAreaField name="invoiceTerms" label="Conditions des factures" defaultValue={f("invoiceTerms")} rows={3} />
        <TextAreaField
          name="footerNote"
          label="Pied de page"
          description="Une ligne libre, sous les identifiants légaux."
          defaultValue={f("footerNote")}
          rows={2}
        />
      </fieldset>

      <SubmitButton className="self-start">Enregistrer l&apos;identité</SubmitButton>
    </form>
  );
}

/** Paramètres keeps its own state for the two ids and posts them as fields. */
function StatefulPicker({
  name,
  label,
  hint,
  initialId,
  storage,
}: {
  name: string;
  label: string;
  hint: string;
  initialId: number | null;
  storage: boolean;
}) {
  const [id, setId] = useState<number | null>(initialId);
  return <ImagePicker name={name} label={label} hint={hint} value={id} onChange={setId} storage={storage} />;
}
