import Image from "next/image";
import { HOME_MEDIA } from "@/lib/data/media";
import { cn } from "@/lib/cn";

/**
 * The Setycore logo supplied by the owner, cut out on a transparent ground. Every surface
 * that carries it is light, so the dark-text artwork is the only variant. The source is
 * 193 × 57 px — swap in a vector or a 2× export when one exists.
 *
 * `self-start` because the footer puts it in a flex column, where `w-auto` would stretch
 * it to the column's width and drag the height up with it.
 */
export function Logo({ name, className }: { name: string; className?: string }) {
  return (
    <Image
      src={HOME_MEDIA.logo}
      alt={name}
      width={193}
      height={57}
      priority
      className={cn("h-8 w-auto self-start md:h-9", className)}
    />
  );
}
