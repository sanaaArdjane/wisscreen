"use client";

import { useState } from "react";
import { ICON_NAMES, type IconName } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

/** Icons that only make sense in the dashboard chrome — not offered for site content. */
const CHROME_ONLY = new Set<IconName>([
  "menu",
  "close",
  "chevron-down",
  "chevron-right",
  "panel-left-close",
  "panel-left-open",
  "log-out",
  "maximize",
  "minimize",
  "sun",
  "moon",
  "trash",
  "move",
]);
const CHOICES = ICON_NAMES.filter((n) => !CHROME_ONLY.has(n));

/** A compact icon chooser: the current icon as a button, the grid on demand. */
export function IconPicker({ value, onChange, label }: { value: IconName; onChange: (v: IconName) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`${label} : ${value}. Changer`}
        className="flex w-fit items-center gap-2 rounded-2xl bg-soft px-3 py-2 text-sm text-fg hover:bg-fg/8"
      >
        <Icon name={value} className="h-5 w-5" />
        <span className="font-mono text-xs text-fg/80">{value}</span>
        <Icon name="chevron-down" className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="listbox" aria-label={label} className="grid grid-cols-8 gap-1 rounded-2xl bg-soft p-2 sm:grid-cols-10">
          {CHOICES.map((name) => (
            <button
              key={name}
              type="button"
              role="option"
              aria-selected={name === value}
              title={name}
              onClick={() => {
                onChange(name);
                setOpen(false);
              }}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl text-fg transition-colors",
                name === value ? "bg-fg text-on-fg" : "hover:bg-fg/10",
              )}
            >
              <Icon name={name} className="h-5 w-5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
