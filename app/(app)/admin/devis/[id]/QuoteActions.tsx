"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import type { QuoteStatus } from "@/lib/billing";
import { deleteQuote, invoiceFromQuote, sendQuote } from "../actions";

/**
 * What can be done to a quote, given where it is in its life.
 *
 * Each branch is one small form rather than a dropdown of verbs: the available
 * actions differ per state, and rendering only the ones that apply is what stops
 * "envoyer" being clickable on a quote the client already refused.
 */
export function QuoteActions({
  quoteId,
  status,
  hasInvoice,
  canInvoice,
  canDelete,
}: {
  quoteId: number;
  status: QuoteStatus;
  hasInvoice: boolean;
  canInvoice: boolean;
  canDelete: boolean;
}) {
  const [armed, setArmed] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {status === "brouillon" && (
        <form action={sendQuote}>
          <input type="hidden" name="quoteId" value={quoteId} />
          <Button type="submit" fullWidth>
            Envoyer au client
          </Button>
          <p className="mt-2 text-xs text-ink/80">
            Le client reçoit une notification et un e-mail, et peut répondre depuis son espace.
          </p>
        </form>
      )}

      {status === "envoye" && (
        <p className="text-sm text-ink/80">
          En attente de la réponse du client. Vous pouvez encore corriger le contenu.
        </p>
      )}

      {status === "accepte" && canInvoice && (
        <form action={invoiceFromQuote}>
          <input type="hidden" name="quoteId" value={quoteId} />
          <Button type="submit" fullWidth isDisabled={hasInvoice}>
            {hasInvoice ? "Facture déjà créée" : "Créer la facture"}
          </Button>
        </form>
      )}

      {status === "refuse" && (
        <p className="text-sm text-ink/80">
          Devis refusé. Créez-en un nouveau si les conditions changent.
        </p>
      )}

      {canDelete && status === "brouillon" && (
        <div className="border-t border-ink/10 pt-4">
          {armed ? (
            <form action={deleteQuote} className="flex flex-col gap-2">
              <input type="hidden" name="quoteId" value={quoteId} />
              <p className="text-sm text-ink/80">Supprimer définitivement ce brouillon ?</p>
              <div className="flex gap-2">
                <Button type="submit" variant="secondary">
                  Supprimer
                </Button>
                <Button variant="ghost" onPress={() => setArmed(false)}>
                  Annuler
                </Button>
              </div>
            </form>
          ) : (
            <Button variant="tertiary" onPress={() => setArmed(true)}>
              Supprimer le brouillon
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
