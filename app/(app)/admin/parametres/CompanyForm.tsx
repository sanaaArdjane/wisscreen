"use client";

import { useActionState, useRef, useState } from "react";
import { Button, Spinner } from "@heroui/react";
import { Field, FormAlert, SubmitButton, TextAreaField } from "@/components/dashboard/ui";
import { Icon } from "@/components/ui/Icon";
import { IDLE, type ActionState } from "@/lib/actions";
import type { CompanyIdentity } from "@/lib/settings";
import { uploadFile } from "@/lib/upload-client";
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
        <ImagePicker
          name="logoAttachmentId"
          label="Logo"
          hint="PNG ou JPEG, fond transparent ou blanc. Affiché en haut à gauche."
          initialId={company.logoAttachmentId}
          storage={storage}
        />
        <ImagePicker
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

function ImagePicker({
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function pick(file: File) {
    setError(null);
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("PNG ou JPEG uniquement.");
      return;
    }
    setBusy(true);
    const result = await uploadFile(file, { company: true });
    setBusy(false);
    if (input.current) input.current.value = "";
    if (!result.ok) setError(result.error);
    else setId(result.id);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-fg">{label}</span>
      <input type="hidden" name={name} value={id ?? ""} />
      <div className="flex min-h-24 items-center justify-center rounded-2xl border border-dashed border-fg/25 bg-white p-3">
        {id ? (
          // Plain <img>: an authorised redirect to a presigned URL, which the
          // image optimiser could not follow with the viewer's session.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/uploads?id=${id}&inline=1`} alt={label} className="max-h-20 max-w-full object-contain" />
        ) : (
          <span className="text-xs text-ink/80">Aucune image</span>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pick(file);
        }}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" isDisabled={!storage || busy} onPress={() => input.current?.click()}>
          {busy ? <Spinner className="size-3.5" /> : <Icon name="upload" className="size-3.5" />}
          {id ? "Remplacer" : "Téléverser"}
        </Button>
        {id && (
          <Button size="sm" variant="danger-soft" onPress={() => setId(null)}>
            <Icon name="trash" className="size-3.5 text-danger-fg" />
            Retirer
          </Button>
        )}
      </div>
      <p className="text-xs text-fg/80">{storage ? hint : "Stockage de fichiers non configuré."}</p>
      {error && <p className="text-sm text-fg">{error}</p>}
    </div>
  );
}
