import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Reveal } from "@/components/ui/Reveal";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-5",
        align === "center" ? "items-center text-center" : "items-start text-left",
        className,
      )}
    >
      {eyebrow && (
        <Badge data-reveal-item className="text-warm border-warm/40">
          {eyebrow}
        </Badge>
      )}
      <h2
        data-reveal-item
        className={cn(
          "font-display text-balance text-4xl font-semibold leading-[1.05] md:text-6xl",
          align === "center" && "max-w-3xl",
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          data-reveal-item
          className={cn(
            "max-w-2xl text-lg leading-relaxed opacity-70 md:text-xl",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      )}
    </Reveal>
  );
}
