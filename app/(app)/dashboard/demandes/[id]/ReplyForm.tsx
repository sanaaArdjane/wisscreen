"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormAlert, SubmitButton, TextAreaField } from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import { replyToRequest } from "../actions";

/**
 * The reply box. Clears itself on a successful send — a thread that leaves the
 * message sitting in the textarea after it has been posted invites sending it
 * twice.
 */
export function ReplyForm({ requestId }: { requestId: number }) {
  const [state, action] = useActionState<ActionState, FormData>(replyToRequest, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <input type="hidden" name="requestId" value={requestId} />
      {!state.ok && <FormAlert state={state} />}
      <TextAreaField
        name="body"
        label="Répondre"
        placeholder="Votre message à l'équipe…"
        error={state.fieldErrors?.body}
        rows={4}
        isRequired
      />
      <SubmitButton className="self-start">Envoyer</SubmitButton>
    </form>
  );
}
