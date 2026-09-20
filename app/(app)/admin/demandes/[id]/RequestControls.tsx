"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  CheckboxField,
  FormAlert,
  SelectField,
  SubmitButton,
  TextAreaField,
  type Option,
} from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import { assignRequest, changeStatus, staffReply } from "../actions";

/**
 * The three desk controls on a request. Separate forms on purpose: a single
 * "save everything" form means answering a message and reassigning the dossier
 * are the same submit, and the audit log can no longer tell them apart.
 */

export function StatusControl({
  requestId,
  current,
  allowed,
}: {
  requestId: number;
  current: string;
  /** Only the transitions `nextStatuses()` permits from here. */
  allowed: Option[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(changeStatus, IDLE);

  if (allowed.length === 0) {
    return (
      <p className="text-sm text-ink/80">
        Cette demande est clôturée — son statut ne peut plus changer.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="requestId" value={requestId} />
      <FormAlert state={state} />
      <SelectField
        name="status"
        label="Faire passer à"
        options={allowed}
        defaultValue={allowed[0]?.value}
        error={state.fieldErrors?.status}
        isRequired
      />
      <SubmitButton className="self-start">Appliquer</SubmitButton>
      <p className="text-xs text-ink/80">Statut actuel : {current}</p>
    </form>
  );
}

export function AssignControl({
  requestId,
  assignees,
  priorities,
  currentAssignee,
  currentPriority,
}: {
  requestId: number;
  assignees: Option[];
  priorities: Option[];
  currentAssignee: string | null;
  currentPriority: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(assignRequest, IDLE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="requestId" value={requestId} />
      <FormAlert state={state} />
      <SelectField
        name="assigneeId"
        label="Responsable"
        options={[{ value: "", label: "Personne" }, ...assignees]}
        defaultValue={currentAssignee ?? ""}
        error={state.fieldErrors?.assigneeId}
      />
      <SelectField
        name="priority"
        label="Priorité"
        options={priorities}
        defaultValue={currentPriority}
        error={state.fieldErrors?.priority}
        isRequired
      />
      <SubmitButton variant="secondary" className="self-start">
        Enregistrer
      </SubmitButton>
    </form>
  );
}

export function StaffReplyForm({ requestId }: { requestId: number }) {
  const [state, action] = useActionState<ActionState, FormData>(staffReply, IDLE);
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
        label="Répondre au client"
        placeholder="Votre réponse…"
        error={state.fieldErrors?.body}
        rows={4}
        isRequired
      />
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>Envoyer</SubmitButton>
        {/* Unchecked by default, every time. A note that stays "internal" from a
            previous message is how a private remark reaches a client. */}
        <CheckboxField name="internal" label="Note interne (invisible pour le client)" />
      </div>
    </form>
  );
}

