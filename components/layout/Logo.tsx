import { cn } from "@/lib/cn";

/**
 * The SETYCORP wordmark, set in the site's own type rather than shipped as a bitmap: the
 * supplied file read "Setycore" (the marketplace's name, not the company's), was upscaled
 * from a 3.8 KB JPEG, and carried the retired green. Live text stays sharp at any size and
 * takes the palette with it — "Sety" in ink, "corp" white on the CTA teal (5.36:1), on a
 * slanted flag that echoes the supplied artwork. Swap back to an <Image> once a real
 * vector logo exists.
 */
export function Logo({ name, className }: { name: string; className?: string }) {
  return (
    <span
      role="img"
      aria-label={name}
      className={cn("inline-flex select-none items-center text-[1.55rem] font-semibold leading-none tracking-[-0.03em] md:text-[1.7rem]", className)}
    >
      <span aria-hidden className="text-ink">
        Sety
      </span>
      <span aria-hidden className="ml-[0.06em] -skew-x-[8deg] rounded-[0.3em] bg-signal-strong px-[0.22em] pb-[0.12em] pt-[0.06em]">
        <span className="inline-block skew-x-[8deg] text-paper">corp</span>
      </span>
    </span>
  );
}
