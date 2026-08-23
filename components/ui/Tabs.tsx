"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface TabDef {
  id: string;
  label: string;
}

export function Tabs({
  tabs,
  defaultTab,
  className,
  children,
}: {
  tabs: TabDef[];
  defaultTab?: string;
  className?: string;
  children: (activeId: string) => ReactNode;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);

  return (
    <div className={cn("flex flex-col gap-10", className)}>
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-medium tracking-tight transition-colors duration-300",
                isActive ? "control-accent" : "bg-current/8 text-inherit hover:bg-current/14",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div>{children(active)}</div>
    </div>
  );
}
