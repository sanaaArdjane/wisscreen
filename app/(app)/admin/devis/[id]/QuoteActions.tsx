"use client";

import { useActionState } from "react";
import { Button } from "@heroui/react";
import { ConfirmButton, FormAlert, SubmitButton, TextAreaField } from "@/components/dashboard/ui";
import { Icon } from "@/components/ui/Icon";
import { IDLE, type ActionState } from "@/lib/actions";
import type { QuoteStatus } from "@/lib/billing";
import { deleteQuote, invoiceFromQuote, sendQuote } from "../actions";

/**
 * What can be done to a quote, given where it is in its life.
 *
 * Only the verbs that apply are rendered — "envoyer" is not clickable on a
 * quote the client already refused. The PDF is always available, and "renvoyer"
 * exists in every state after the first send.
 */
export function QuoteActions({
  quoteId,
  quoteRef,
  status,
  sentAt,
  hasInvoice,
  canWrite,
  canInvoice,
  canProvision,
  canDelete,
}: {
  quoteId: number;
  quoteRef: string;
  status: QuoteStatus;
  sentAt: string | null;
  hasInvoice: boolean;
  canWrite: boolean;
  canInvoice: boolean;
  canProvision?: boolean;
  canDelete: boolean;
}) {
  const [sendState, send] = useActionState<ActionState, FormData>(sendQuote, IDLE);
  const [deleteState, remove] = useActionState<ActionState, FormData>(deleteQuote, IDLE);
  const draft = status === "brouillon";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <a
          href={`/api/documents/devis/${quoteId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-soft px-4 py-2 text-sm font-[650] text-fg hover:bg-fg/8"
        >
          <Icon name="file-text" className="size-4" />
          Aperçu PDF
        </a>
        <a
          href={`/api/documents/devis/${quoteId}?download=1`}
          className="inline-flex items-center gap-2 rounded-full bg-soft px-4 py-2 text-sm font-[650] text-fg hover:bg-fg/8"
        >
          <Icon name="download" className="size-4" />
          Télécharger
        </a>
      </div>

      {canWrite && (
        <form action={send} className="flex flex-col gap-3">
          <input type="hidden" name="quoteId" value={quoteId} />
          <FormAlert state={sendState} />
          <TextAreaField
            name="message"
            label="Message d'accompagnement"
            description="Facultatif. Sinon, un message standard présente le devis."
            rows={3}
          />
          <SubmitButton className="self-start">
            <Icon name="send" className="size-4" />
            {draft ? "Envoyer au client (e-mail + PDF)" : "Renvoyer par e-mail"}
          </SubmitButton>
          <p className="text-xs text-fg/80">
            {draft
              ? "Le client reçoit le PDF par e-mail, une notification, et peut répondre depuis son espace."
              : sentAt
                ? `Dernier envoi : ${sentAt}.`
                : "Renvoie le PDF à jour, sans changer le statut."}
          </p>
        </form>
      )}

      {status === "envoye" && (
        <p className="text-sm text-fg/80">En attente de la réponse du client. Vous pouvez encore corriger le contenu.</p>
      )}

      {status === "accepte" && canInvoice && (
        <form action={invoiceFromQuote}>
          <input type="hidden" name="quoteId" value={quoteId} />
          <Button type="submit" fullWidth variant="secondary">
            <Icon name="receipt" className="size-4" />
            {hasInvoice ? "Voir la facture" : "Créer la facture"}
          </Button>
        </form>
      )}

      {status === "accepte" && canProvision && (
        <a
          href={`/admin/abonnements/nouveau?devis=${quoteId}`}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-soft px-4 py-2.5 text-sm font-[650] text-fg hover:bg-fg/8"
        >
          <Icon name="server" className="size-4" />
          Provisionner le service
        </a>
      )}

      {status === "refuse" && (
        <p className="text-sm text-fg/80">Devis refusé. Créez-en un nouveau si les conditions changent.</p>
      )}

      {canDelete && (
        <div className="border-t border-fg/10 pt-4">
          <ConfirmButton
            action={remove}
            label={draft ? "Supprimer le brouillon" : "Supprimer ce devis"}
            hidden={{ quoteId }}
            typeToConfirm={draft ? undefined : quoteRef}
            description={
              draft
                ? "Le brouillon est supprimé définitivement."
                : "Le client a déjà reçu ce devis : il disparaîtra de son espace, mais pas de sa boîte e-mail. Une facture liée est conservée."
            }
          >
            <FormAlert state={deleteState} />
          </ConfirmButton>
        </div>
      )}
    </div>
  );
}
