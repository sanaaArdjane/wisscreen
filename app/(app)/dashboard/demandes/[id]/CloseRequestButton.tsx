"use client";

import { useState } from "react";
import { Button } from "@heroui/react";
import { closeOwnRequest } from "../actions";

/**
 * Two-step, because closing is not reversible from the client side: the first
 * click arms it, the second submits. A `confirm()` dialog would do the same job
 * but is unstyleable and reads as a browser error to most people.
 */
export function CloseRequestButton({ requestId }: { requestId: number }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <Button variant="tertiary" onPress={() => setArmed(true)}>
        Clôturer
      </Button>
    );
  }

  return (
    <form action={closeOwnRequest} className="flex items-center gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      <span className="text-sm text-fg/80">Clôturer cette demande ?</span>
      <Button type="submit" variant="secondary">
        Oui, clôturer
      </Button>
      <Button variant="ghost" onPress={() => setArmed(false)}>
        Annuler
      </Button>
    </form>
  );
}
