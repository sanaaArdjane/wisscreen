"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@heroui/react";
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
import { assignRequest, changeStatus, deleteRequest, staffReply, updateRequest } from "../actions";

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
      <p className="text-sm text-fg/80">
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
      <p className="text-xs text-fg/80">Statut actuel : {current}</p>
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


/** Correct what the client filed. Not notified — it's the desk's own record. */
export function EditRequestForm({
  requestId,
  title,
  details,
  budget,
}: {
  requestId: number;
  title: string;
  details: string;
  budget: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(updateRequest, IDLE);
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="tertiary" onPress={() => setOpen(true)}>
        Modifier l&apos;intitulé, la description ou le budget
      </Button>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="requestId" value={requestId} />
      <FormAlert state={state} />
      <Field name="title" label="Intitulé" defaultValue={state.values?.title ?? title} error={state.fieldErrors?.title} isRequired />
      <TextAreaField
        name="details"
        label="Description"
        defaultValue={state.values?.details ?? details}
        error={state.fieldErrors?.details}
        rows={6}
        isRequired
      />
      <Field
        name="budget"
        label="Budget indicatif"
        inputMode="decimal"
        defaultValue={state.values?.budget ?? budget}
        error={state.fieldErrors?.budget}
        description="Vide = non renseigné."
      />
      <div className="flex gap-2">
        <SubmitButton>Enregistrer</SubmitButton>
        <Button variant="ghost" onPress={() => setOpen(false)}>
          Fermer
        </Button>
      </div>
    </form>
  );
}

export function DeleteRequestForm({ requestId, requestRef }: { requestId: number; requestRef: string }) {
  const [state, action] = useActionState<ActionState, FormData>(deleteRequest, IDLE);
  return (
    <ConfirmButton
      action={action}
      label="Supprimer cette demande"
      hidden={{ requestId }}
      typeToConfirm={requestRef}
      description="La demande, son fil de discussion et ses pièces jointes sont supprimés. Les devis et services liés sont conservés, sans lien vers elle."
      fullWidth
    >
      <FormAlert state={state} />
    </ConfirmButton>
  );
}
