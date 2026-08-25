"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * A real photo laid **over** a fallback, with the decode covered.
 *
 * Every media slot in this app renders a generated on-brand mock and then puts the real
 * asset on top of it, so there is never a moment of broken image or empty box. This
 * component is the "on top of it" half:
 *
 * 1. while the file is decoding, an opaque `skeleton-sweep` panel covers the mock — so
 *    the visitor sees a loading surface, not the placeholder art flashing past;
 * 2. on `load`, the skeleton fades out and the photo fades in;
 * 3. on `error` it renders **nothing at all**, which uncovers the mock underneath. A
 *    dead link degrades to the placeholder instead of an alt-text box.
 *
 * `unoptimized` is picked automatically from the shape of `src`: a local path goes
 * through the image optimizer, an absolute URL does not. That is what lets a client
 * paste `https://…` into `lib/data/services.ts` without also having to add the host to
 * `images.remotePatterns` in next.config.ts — the optimizer validates remote hosts, and
 * serving the file as-is skips that route entirely.
 */
export function LoadingImage({
  src,
  alt,
  sizes,
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  /** Required by next/image with `fill`; describes the frame's rendered width. */
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");

  if (status === "failed") return null;

  return (
    <>
      {/* Opaque, not a tint: it has to hide the mock it is layered over. `abyss` rather
          than `ink` because the surfaces this lands on are mostly `ink` themselves — a
          same-value panel reads as an empty card instead of as something loading. */}
      <div
        className={cn(
          "skeleton-sweep pointer-events-none absolute inset-0 overflow-hidden bg-abyss transition-opacity duration-500",
          status === "ready" && "opacity-0",
        )}
        aria-hidden="true"
      />
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={isRemote(src)}
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("failed")}
        className={cn(
          "object-cover transition-opacity duration-700 ease-out",
          status === "ready" ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </>
  );
}

/** An absolute URL bypasses the image optimizer; a local path goes through it. */
export const isRemote = (src: string) => /^https?:\/\//i.test(src);
