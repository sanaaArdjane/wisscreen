import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * The logo, cut out on a transparent ground. Its dark half would vanish on a dark bar, so
 * `onDark` swaps in the variant with that half turned white (`HOME_MEDIA.logoLight`).
 */
export function Logo({
  logo,
  name,
  onDark = false,
  className,
}: {
  logo: { src: string; light: string };
  name: string;
  onDark?: boolean;
  className?: string;
}) {
  return (
    <Image
      src={onDark ? logo.light : logo.src}
      alt={name}
      width={579}
      height={171}
      priority
      className={cn("h-8 w-auto md:h-9", className)}
    />
  );
}
