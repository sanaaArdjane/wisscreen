"use client";

import { useActionState } from "react";
import {
  CheckboxField,
  ConfirmButton,
  Field,
  FormAlert,
  SelectField,
  SubmitButton,
  TextAreaField,
} from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import { CATEGORY_LABELS, METRIC_LABELS } from "@/lib/quotas";
import { deleteCatalogueItem, saveCatalogueItem } from "./actions";

export type CatalogueDefaults = {
  slug?: string;
  name?: string;
  description?: string;
  category?: string;
  price?: string;
  currency?: string;
  billingPeriod?: string;
  specs?: string;
  features?: string;
  grants?: string;
  sortOrder?: number;
  active?: boolean;
};

export function CatalogueForm({ item = {}, isEdit }: { item?: CatalogueDefaults; isEdit?: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(saveCatalogueItem, IDLE);
  const v = state.values ?? {};
  return (
    <form action={action} className="flex flex-col gap-6">
      {isEdit && <input type="hidden" name="originalSlug" value={item.slug} />}
      <FormAlert state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field name="name" label="Nom" defaultValue={v.name ?? item.name} error={state.fieldErrors?.name} isRequired placeholder="VPS Performance 4 vCPU" />
        <Field
          name="slug"
          label="Identifiant"
          defaultValue={v.slug ?? item.slug}
          error={state.fieldErrors?.slug}
          isRequired
          placeholder="vps-perf-4"
          description="Minuscules et tirets. Sert de référence interne."
        />
        <SelectField
          name="category"
          label="Catégorie"
          options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
          defaultValue={v.category ?? item.category ?? "infrastructure"}
          isRequired
        />
        <div className="grid grid-cols-[1fr_6rem_1fr] gap-3">
          <Field
            name="price"
            label="Prix"
            defaultValue={v.price ?? item.price ?? ""}
            error={state.fieldErrors?.price}
            inputMode="decimal"
            description="Vide = sur devis"
          />
          <Field name="currency" label="Devise" defaultValue={v.currency ?? item.currency ?? "DZD"} />
          <SelectField
            name="billingPeriod"
            label="Période"
            options={[
              { value: "monthly", label: "Par mois" },
              { value: "yearly", label: "Par an" },
              { value: "one_off", label: "Une fois" },
            ]}
            defaultValue={v.billingPeriod ?? item.billingPeriod ?? "monthly"}
          />
        </div>
        <TextAreaField
          name="description"
          label="Description"
          defaultValue={v.description ?? item.description}
          error={state.fieldErrors?.description}
          isRequired
          rows={3}
          className="sm:col-span-2"
        />
        <TextAreaField
          name="specs"
          label="Caractéristiques"
          description="Une par ligne, « Libellé : valeur » — vCPU : 4, RAM : 8 Go, Stockage : 200 Go SSD…"
          defaultValue={v.specs ?? item.specs ?? ""}
          rows={5}
        />
        <TextAreaField
          name="features"
          label="Points forts"
          description="Un par ligne. Affichés en liste côté client."
          defaultValue={v.features ?? item.features ?? ""}
          rows={5}
        />
        <TextAreaField
          name="grants"
          label="Quotas accordés"
          description={`Une par ligne, « métrique : limite » ou « métrique : illimité ». Connues : ${Object.keys(METRIC_LABELS).join(", ")}. Ajoutés au compte du client à la mise en service.`}
          defaultValue={v.grants ?? item.grants ?? ""}
          error={state.fieldErrors?.grants}
          rows={4}
          className="sm:col-span-2"
        />
        <Field
          name="sortOrder"
          label="Ordre d'affichage"
          defaultValue={v.sortOrder ?? String(item.sortOrder ?? 0)}
          inputMode="numeric"
        />
        <CheckboxField
          name="active"
          label="Proposée aux clients"
          description="Décochez pour ne plus la vendre sans toucher aux services existants."
          defaultChecked={item.active ?? true}
          className="self-end"
        />
      </div>
      <SubmitButton className="self-start">{isEdit ? "Enregistrer l'offre" : "Créer l'offre"}</SubmitButton>
    </form>
  );
}

export function DeleteCatalogueForm({ slug }: { slug: string }) {
  const [state, action] = useActionState<ActionState, FormData>(deleteCatalogueItem, IDLE);
  return (
    <ConfirmButton
      action={action}
      label="Supprimer cette offre"
      hidden={{ slug }}
      typeToConfirm={slug}
      description="L'offre disparaît du catalogue. Les services déjà souscrits sont conservés avec leur prix et leurs caractéristiques ; ils perdent seulement le lien vers cette offre."
    >
      <FormAlert state={state} />
    </ConfirmButton>
  );
}
