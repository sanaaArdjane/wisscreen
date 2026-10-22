"use client";

import { useActionState } from "react";
import {
  Field,
  FormAlert,
  SelectField,
  SubmitButton,
  TextAreaField,
  type Option,
} from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import { createRequestForClient } from "../actions";

export function NewRequestForClientForm({
  clients,
  typeOptions,
  serviceOptions,
  priorityOptions,
  defaultClient,
  defaultType,
  demoOptions,
  planOptions,
}: {
  clients: Option[];
  typeOptions: Option[];
  serviceOptions: Option[];
  priorityOptions: Option[];
  defaultClient?: string;
  defaultType?: string;
  demoOptions: Option[];
  planOptions: Option[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(createRequestForClient, IDLE);
  const v = state.values ?? {};

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormAlert state={state} />
      <SelectField
        name="userId"
        label="Client"
        options={clients}
        defaultValue={v.userId ?? defaultClient}
        error={state.fieldErrors?.userId}
        placeholder="Choisir un client"
        isRequired
      />
      <Field
        name="title"
        label="Objet"
        placeholder="Ex. Démo OCR sur vos factures fournisseurs"
        defaultValue={v.title}
        error={state.fieldErrors?.title}
        isRequired
      />
      <div className="grid gap-5 sm:grid-cols-3">
        <SelectField
          name="type"
          label="Type"
          options={typeOptions}
          defaultValue={v.type ?? defaultType ?? "demo"}
          error={state.fieldErrors?.type}
          isRequired
        />
        <SelectField
          name="serviceSlug"
          label="Solution"
          options={serviceOptions}
          defaultValue={v.serviceSlug}
          error={state.fieldErrors?.serviceSlug}
          placeholder="Aucune en particulier"
        />
        <SelectField
          name="priority"
          label="Priorité"
          options={priorityOptions}
          defaultValue={v.priority ?? "normale"}
          error={state.fieldErrors?.priority}
          isRequired
        />
      </div>
      <TextAreaField
        name="details"
        label="Message au client"
        description="Premier message du fil, envoyé par e-mail et en notification."
        defaultValue={v.details}
        error={state.fieldErrors?.details}
        rows={7}
        isRequired
      />
      {(demoOptions.length > 0 || planOptions.length > 0) && (
        <fieldset className="grid gap-5 rounded-2xl bg-soft p-5 sm:grid-cols-2">
          <legend className="sr-only">Joindre à la demande</legend>
          {demoOptions.length > 0 && (
            <SelectField
              name="demoId"
              label="Attribuer une démo"
              description="Facultatif — le client y a accès tout de suite."
              options={demoOptions}
              defaultValue={v.demoId}
              error={state.fieldErrors?.demoId}
              placeholder="Aucune démo"
            />
          )}
          {planOptions.length > 0 && (
            <SelectField
              name="planSlug"
              label="Proposer un service"
              description="Facultatif — crée un service « en attente » au tarif du catalogue."
              options={planOptions}
              defaultValue={v.planSlug}
              error={state.fieldErrors?.planSlug}
              placeholder="Aucun service"
            />
          )}
          <p className="text-sm text-fg/80 sm:col-span-2">
            Pour joindre des fichiers, ouvrez la demande après l&apos;envoi : le dépôt de livrables s&apos;y trouve.
          </p>
        </fieldset>
      )}
      <div>
        <SubmitButton>Envoyer au client</SubmitButton>
      </div>
    </form>
  );
}
