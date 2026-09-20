"use client";

import { Button } from "@heroui/react";
import { markAllRead } from "./actions";

export function MarkAllReadButton() {
  return (
    <form action={markAllRead}>
      <Button type="submit" variant="secondary">
        Tout marquer comme lu
      </Button>
    </form>
  );
}
