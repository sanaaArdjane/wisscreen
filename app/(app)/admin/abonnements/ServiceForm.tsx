"use client";

import { useActionState, useState } from "react";
import {
  CheckboxField,
  ConfirmButton,
  Field,
  FormAlert,
  SelectField,
  SubmitButton,
  TextAreaField,
  type Option,
} from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import { SUBSCRIPTION_LABELS, SUBSCRIPTION_STATUSES } from "@/lib/quota-labels";
import { deleteService, saveService } from "./actions";

export type ServiceDefaults = {
  subscriptionId?: number;
  userId?: string;
  planSlug?: string | null;
  label?: string | null;
  requestId?: number | null;
  quoteId?: number | null;
  price?: string;
  currency?: string;
  billingPeriod?: string;
  resourceSpec?: string;
  accessNotes?: string | null;
  status?: string;
  periodStart?: string;
  renewsAt?: string;
  note?: string | null;
};

type PlanOption = Option & { grants: string; period: string; price: string; currency: string };

export function ServiceForm({
  service = {},
  clients,
  plansList,
}: {
  service?: ServiceDefaults;
  clients: Option[];
  plansList: PlanOption[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveService, IDLE);
  const v = state.values ?? {};
  const [planSlug, setPlanSlug] = useState(v.planSlug ?? service.planSlug ?? "");
  const plan = plansList.find((p) => p.value === planSlug);
  const isEdit = Boolean(service.subscriptionId);

  return (
    <form action={action} className="flex flex-col gap-6">
      {isEdit && <input type="hidden" name="subscriptionId" value={service.subscriptionId} />}
      {service.requestId && <input type="hidden" name="requestId" value={service.requestId} />}
      {service.quoteId && <input type="hidden" name="quoteId" value={service.quoteId} />}
      <FormAlert state={state} />

      <div className="grid gap-5 sm:grid-cols-2">
        {isEdit ? (
          <input type="hidden" name="userId" value={service.userId} />
        ) : (
          <SelectField
            name="userId"
            label="Client"
            options={clients}
            defaultValue={v.userId ?? service.userId}
            error={state.fieldErrors?.userId}
            isRequired
          />
        )}
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-fg">Offre du catalogue</span>
          <select
            name="planSlug"
            value={planSlug}
            onChange={(e) => setPlanSlug(e.target.value)}
            className="rounded-2xl bg-soft px-3 py-2.5 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-fg"
          >
            <option value="">Service sur mesure</option>
            {plansList.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-fg/80">
            {plan
              ? `Prix, période et caractéristiques repris de l'offre si vous les laissez vides.`
              : "Décrivez le service ci-dessous."}
          </span>
        </label>
        <Field
          name="label"
          label="Nom pour ce client"
          placeholder={plan?.label ?? "VPS production"}
          defaultValue={v.label ?? service.label ?? ""}
          error={state.fieldErrors?.label}
          description={plan ? "Facultatif — par défaut, le nom de l'offre." : "Requis pour un service sur mesure."}
        />
        <SelectField
          name="status"
          label="Statut"
          options={SUBSCRIPTION_STATUSES.map((s) => ({ value: s, label: SUBSCRIPTION_LABELS[s] }))}
          defaultValue={v.status ?? service.status ?? "pending"}
          description="Le client est notifié à chaque changement."
          isRequired
        />
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <Field
            name="price"
            label="Prix"
            inputMode="decimal"
            defaultValue={v.price ?? service.price ?? ""}
            error={state.fieldErrors?.price}
            placeholder={plan?.price || "Sur devis"}
          />
          <Field name="currency" label="Devise" defaultValue={v.currency ?? service.currency ?? plan?.currency ?? "DZD"} />
        </div>
        <SelectField
          name="billingPeriod"
          label="Facturation"
          options={[
            { value: "monthly", label: "Mensuelle" },
            { value: "yearly", label: "Annuelle" },
            { value: "one_off", label: "Ponctuelle" },
          ]}
          defaultValue={v.billingPeriod ?? service.billingPeriod ?? plan?.period ?? "monthly"}
        />
        <Field
          name="periodStart"
          label="Mise en service"
          type="date"
          defaultValue={v.periodStart ?? service.periodStart ?? ""}
          description="Vide = aujourd'hui."
        />
        <Field
          name="renewsAt"
          label="Prochain renouvellement"
          type="date"
          defaultValue={v.renewsAt ?? service.renewsAt ?? ""}
        />
        <TextAreaField
          name="resourceSpec"
          label="Caractéristiques livrées"
          description="« Libellé : valeur » par ligne — IP : 203.0.113.10, OS : Debian 12… Vide = celles de l'offre."
          defaultValue={v.resourceSpec ?? service.resourceSpec ?? ""}
          rows={4}
        />
        <TextAreaField
          name="accessNotes"
          label="Accès (visible par le client)"
          description="URL du panneau, nom d'hôte. Jamais de mot de passe ici — utilisez une démo avec identifiants chiffrés."
          defaultValue={v.accessNotes ?? service.accessNotes ?? ""}
          rows={4}
        />
        <TextAreaField
          name="note"
          label="Note interne"
          defaultValue={v.note ?? service.note ?? ""}
          rows={2}
          className="sm:col-span-2"
        />
        {plan && plan.grants && (
          <CheckboxField
            name="grantQuotas"
            label={`Accorder les quotas de l'offre (${plan.grants})`}
            description={
              isEdit
                ? "S'ajoutent aux limites actuelles du client. À ne cocher qu'une fois par souscription."
                : "S'ajoutent aux limites actuelles du client."
            }
            defaultChecked={!isEdit}
            className="sm:col-span-2"
          />
        )}
      </div>
      <SubmitButton className="self-start">{isEdit ? "Enregistrer" : "Provisionner le service"}</SubmitButton>
    </form>
  );
}

export function DeleteServiceForm({ subscriptionId, hasPlan }: { subscriptionId: number; hasPlan: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(deleteService, IDLE);
  return (
    <ConfirmButton
      action={action}
      label="Supprimer ce service"
      hidden={{ subscriptionId }}
      description="Le service disparaît de l'espace du client et de l'historique. Pour un client qui arrête, préférez le statut « Résilié »."
    >
      <FormAlert state={state} />
      {hasPlan && <CheckboxField name="revokeQuotas" label="Retirer aussi les quotas accordés par l'offre" />}
    </ConfirmButton>
  );
}
