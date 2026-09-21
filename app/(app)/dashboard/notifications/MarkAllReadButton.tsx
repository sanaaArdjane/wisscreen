"use client";

import { Button } from "@heroui/react";
import { ConfirmButton } from "@/components/dashboard/ui";
import { clearRead, markAllRead } from "./actions";

export function MarkAllReadButton() {
  return (
    <form action={markAllRead}>
      <Button type="submit" variant="secondary">
        Tout marquer comme lu
      </Button>
    </form>
  );
}

export function ClearReadButton({ count }: { count: number }) {
  return (
    <ConfirmButton
      action={clearRead}
      label="Effacer les notifications lues"
      confirmLabel={`Effacer ${count} notification${count > 1 ? "s" : ""}`}
      description="Les notifications déjà lues seront supprimées. Les non lues sont conservées."
    />
  );
}
