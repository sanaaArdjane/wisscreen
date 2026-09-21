"use client";

import { useActionState } from "react";
import { Field, FormAlert, SubmitButton } from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import { createSolution } from "@/app/(app)/admin/site/actions";

/** "Ajouter une solution": a name (and optionally the address), then straight into
 *  its editor. New solutions start hidden until the owner publishes them. */
export function NewSolutionForm() {
  const [state, action] = useActionState<ActionState, FormData>(createSolution, IDLE);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Nom de la solution" isRequired placeholder="Ex. Messagerie SMS" error={state.fieldErrors?.name} />
        <Field
          name="slug"
          label="Adresse (facultatif)"
          placeholder="messagerie-sms"
          description="Devient /solutions/<adresse>. Déduite du nom si vide."
          error={state.fieldErrors?.slug}
        />
      </div>
      <FormAlert state={state} />
      <div>
        <SubmitButton>Créer et modifier</SubmitButton>
      </div>
    </form>
  );
}
