import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

type Variant = "primary" | "secondary" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "control-signal",
  secondary: "bg-ink text-paper hover:bg-abyss",
  ghost: "bg-transparent text-inherit border border-current/25 hover:border-current/60",
};

export function Button({
  children,
  href,
  variant = "primary",
  className,
  withArrow = true,
  onClick,
}: {
  children: ReactNode;
  href?: string;
  variant?: Variant;
  className?: string;
  withArrow?: boolean;
  onClick?: () => void;
}) {
  const classes = cn(
    "group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium tracking-tight transition-all duration-300 ease-out",
    VARIANTS[variant],
    className,
  );

  const content = (
    <>
      {children}
      {withArrow && (
        <Icon
          name="arrow-right"
          className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
        />
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={classes}>
      {content}
    </button>
  );
}
