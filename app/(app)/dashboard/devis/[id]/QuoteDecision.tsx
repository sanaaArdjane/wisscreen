"use client";

import { useActionState } from "react";
import { Button } from "@heroui/react";
import { FormAlert } from "@/components/dashboard/ui";
import { IDLE, type ActionState } from "@/lib/actions";
import { respondToQuote } from "./actions";

/**
 * Accept / refuse, as two submit buttons in one form with a `decision` value.
 *
 * Both are ordinary submits rather than `onPress` handlers so the whole thing
 * works before hydration — a client staring at a quote on a slow connection
 * should not be able to click a dead button.
 */
export function QuoteDecision({ quoteId }: { quoteId: number }) {
  const [state, action] = useActionState<ActionState, FormData>(respondToQuote, IDLE);

  if (state.ok) return <FormAlert state={state} />;

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="quoteId" value={quoteId} />
      <FormAlert state={state} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="decision" value="accepte">
          Accepter le devis
        </Button>
        <Button type="submit" name="decision" value="refuse" variant="tertiary">
          Refuser
        </Button>
      </div>
    </form>
  );
}
