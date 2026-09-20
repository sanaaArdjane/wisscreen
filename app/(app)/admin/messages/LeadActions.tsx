"use client";

import { Button } from "@heroui/react";
import { setLeadStatus } from "./actions";

/**
 * Two buttons in one form, distinguished by the submitted `status`. Plain
 * submits, so the inbox works without JavaScript and each click is one request.
 */
export function LeadActions({ id, status }: { id: number; status: string }) {
  return (
    <form action={setLeadStatus} className="flex gap-2">
      <input type="hidden" name="id" value={id} />
      {status !== "traite" && (
        <Button type="submit" name="status" value="traite" variant="secondary">
          Marquer traité
        </Button>
      )}
      {status !== "archive" && (
        <Button type="submit" name="status" value="archive" variant="ghost">
          Archiver
        </Button>
      )}
      {status !== "nouveau" && (
        <Button type="submit" name="status" value="nouveau" variant="ghost">
          Rouvrir
        </Button>
      )}
    </form>
  );
}
