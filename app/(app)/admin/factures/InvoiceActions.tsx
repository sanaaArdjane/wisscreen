"use client";

import { useActionState } from "react";
import { ConfirmButton, FormAlert, SubmitButton, TextAreaField } from "@/components/dashboard/ui";
import { Icon } from "@/components/ui/Icon";
import { IDLE, type ActionState } from "@/lib/actions";
import { deleteInvoice, sendInvoice } from "./actions";

export function InvoiceActions({
  invoiceId,
  invoiceRef,
  status,
  sentAt,
  canWrite,
  canDelete,
}: {
  invoiceId: number;
  invoiceRef: string;
  status: string;
  sentAt: string | null;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [sendState, send] = useActionState<ActionState, FormData>(sendInvoice, IDLE);
  const [deleteState, remove] = useActionState<ActionState, FormData>(deleteInvoice, IDLE);
  const draft = status === "brouillon";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/documents/facture/${invoiceId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-soft px-4 py-2 text-sm font-[650] text-fg hover:bg-fg/8"
        >
          <Icon name="file-text" className="size-4" />
          Aperçu PDF
        </a>
        <a
          href={`/api/documents/facture/${invoiceId}?download=1`}
          className="inline-flex items-center gap-2 rounded-full bg-soft px-4 py-2 text-sm font-[650] text-fg hover:bg-fg/8"
        >
          <Icon name="download" className="size-4" />
          Télécharger
        </a>
      </div>

      {canWrite && status !== "annulee" && (
        <form action={send} className="flex flex-col gap-3">
          <input type="hidden" name="invoiceId" value={invoiceId} />
          <FormAlert state={sendState} />
          <TextAreaField name="message" label="Message d'accompagnement" description="Facultatif." rows={3} />
          <SubmitButton className="self-start">
            <Icon name="send" className="size-4" />
            {draft ? "Émettre et envoyer (e-mail + PDF)" : "Renvoyer par e-mail"}
          </SubmitButton>
          {sentAt && <p className="text-xs text-fg/80">Dernier envoi : {sentAt}.</p>}
        </form>
      )}

      {canDelete && (
        <div className="border-t border-fg/10 pt-4">
          <ConfirmButton
            action={remove}
            label={draft ? "Supprimer le brouillon" : "Supprimer cette facture"}
            hidden={{ invoiceId }}
            typeToConfirm={draft ? undefined : invoiceRef}
            description={
              draft
                ? "Le brouillon est supprimé définitivement."
                : "Cette facture a été émise. Pour l'invalider en gardant la trace comptable, passez-la plutôt en « Annulée »."
            }
          >
            <FormAlert state={deleteState} />
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}
