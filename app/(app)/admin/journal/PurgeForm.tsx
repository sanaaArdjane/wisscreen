"use client";

import { useActionState } from "react";
import { ConfirmButton, Field, FormAlert } from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import { purgeActivity } from "./actions";

export function PurgeForm() {
  const [state, action] = useActionState<ActionState, FormData>(purgeActivity, IDLE);
  return (
    <div className="flex flex-col gap-3">
      {state.message && <FormAlert state={state} />}
      <ConfirmButton
        action={action}
        label="Purger les anciennes entrées"
        confirmLabel="Supprimer ces entrées"
        description="Les entrées antérieures à la date choisie sont supprimées définitivement. La purge elle-même reste inscrite au journal."
      >
        <Field name="before" label="Supprimer tout ce qui précède le" type="date" isRequired />
      </ConfirmButton>
    </div>
  );
}
