import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export function Badge({ children, className, ...rest }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-current/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]",
        className,
      )}
    >
      {children}
    </span>
  );
}
