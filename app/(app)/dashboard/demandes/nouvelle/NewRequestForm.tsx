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
import { createRequest } from "../actions";

/**
 * A plain `<form action={…}>` bound to a server action with `useActionState`.
 *
 * No client-side validation duplicating the zod schema: the action is the only
 * validator, and it returns `fieldErrors` keyed by input name plus the submitted
 * `values`, so a rejected form re-renders with the messages in place and nothing
 * retyped. Duplicating the rules in the browser means two definitions of "valid"
 * that drift.
 */
export function NewRequestForm({
  typeOptions,
  serviceOptions,
  defaultType,
  defaultService,
}: {
  typeOptions: Option[];
  serviceOptions: Option[];
  defaultType?: string;
  defaultService?: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(createRequest, IDLE);
  const v = state.values ?? {};

  return (
    <form action={action} className="flex flex-col gap-5">
      <FormAlert state={state} />

      <Field
        name="title"
        label="Objet de la demande"
        placeholder="Ex. Intégrer l'OCR à notre back-office"
        defaultValue={v.title}
        error={state.fieldErrors?.title}
        isRequired
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField
          name="type"
          label="Type de demande"
          options={typeOptions}
          defaultValue={v.type ?? defaultType ?? "service"}
          error={state.fieldErrors?.type}
          isRequired
        />
        <SelectField
          name="serviceSlug"
          label="Solution concernée"
          description="Facultatif — laissez vide si votre demande est générale."
          options={serviceOptions}
          defaultValue={v.serviceSlug ?? defaultService}
          error={state.fieldErrors?.serviceSlug}
          placeholder="Aucune en particulier"
        />
      </div>

      <TextAreaField
        name="details"
        label="Votre besoin"
        placeholder="Contexte, volumétrie, contraintes, échéance souhaitée…"
        description="Plus c'est précis, plus notre réponse le sera."
        defaultValue={v.details}
        error={state.fieldErrors?.details}
        rows={8}
        isRequired
      />

      <div className="flex items-center gap-3">
        <SubmitButton>Envoyer la demande</SubmitButton>
        <p className="text-sm text-fg/80">Réponse sous 48 h ouvrées.</p>
      </div>
    </form>
  );
}
