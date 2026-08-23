"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { SERVICES } from "@/lib/data/services";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TypeCycle } from "@/components/ui/TypeCycle";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { EarthNetworkFallback, EarthSkyPlaceholder } from "@/components/three/EarthNetwork";

const EarthNetwork = dynamic(() => import("@/components/three/EarthNetwork"), {
  ssr: false,
  // Ambient aqua only while the chunk loads — no static globe, so the real globe
  // pops in exactly once instead of appearing and then re-animating.
  loading: () => <EarthSkyPlaceholder />,
});

/** Module-level constant: TypeCycle's effect depends on this reference, so an
 * inline array literal would restart the animation on every render. */
const HEADLINE_WORDS = [
  "de solutions",
  "de services",
  "d'idées",
  "de technologies",
  "de possibilités",
];

export function Hero() {
  const root = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  return (
    <section ref={root} className="section-ink relative min-h-[100svh] overflow-hidden bg-abyss">
      {/* Full-width 3D scene. It stops short of the bottom so the globe centres
          higher in the viewport, clear of the copy band stacked below it. */}
      <div className="absolute inset-x-0 top-0 bottom-0 lg:bottom-[16%]">
        {/* If the WebGL scene throws at runtime, fall back to the static globe rather
            than blanking the hero (or taking the page down with it). */}
        <ErrorBoundary
          label="hero-3d"
          fallback={<EarthNetworkFallback message="Aperçu 3D indisponible" />}
        >
          <EarthNetwork
            services={SERVICES}
            overlayRef={overlayRef}
            onSelect={(slug) => router.push(`/solutions/${slug}`)}
          />
        </ErrorBoundary>
        {/* Vignette over the scene. Two jobs: darken the frame so the globe sits in
            space rather than inside a rectangle, and dissolve the canvas's own edges
            into the section colour — on large screens the scene stops at 16% from the
            bottom and would otherwise end on a hard horizontal line.

            It lives INSIDE this wrapper so it covers exactly the canvas bounds, and at
            z-10 so it stays above the canvas (z-auto) but below the marker labels
            (z-20) and the copy band (z-30). */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              "radial-gradient(118% 86% at 50% 38%, transparent 40%, rgba(38,51,76,0.42) 72%, rgba(38,51,76,0.88) 100%)",
          }}
        />
        {/* Portal target for the 3D marker labels. It MUST share the canvas's exact
            bounds — drei positions labels relative to the canvas, so anchoring this
            elsewhere would offset every label. */}
        <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-20" />
      </div>

      {/* Seam falloff. The hero paints `ink` and the next section paints `abyss`, so
          without this the boundary is a visible colour step. Fading the section's own
          bottom to abyss makes the earth sink into the next section's ground instead.
          z-10: above the canvas, below the marker labels (z-20) and the copy (z-30). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[45%] bg-gradient-to-t from-abyss via-abyss/60 to-transparent" />

      {/* Copy: full-bleed band anchored bottom-left. No centered container and no
          max-width on the block — the line runs the width of the viewport. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
        {/* Space-themed backdrop for the copy, spanning the full width. The dot
            texture is masked so it fades out toward the top instead of riding up
            over the globe with a hard edge. */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/80 to-transparent" />
          <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:30px_30px] [mask-image:linear-gradient(to_top,black_25%,transparent_85%)]" />
          <div className="absolute -left-32 bottom-0 h-56 w-[30rem] rounded-full bg-aqua/20 blur-3xl" />
          <div className="absolute -right-24 bottom-0 h-56 w-[30rem] rounded-full bg-teal/15 blur-3xl" />
        </div>

        <div className="pointer-events-auto relative flex flex-col gap-4 px-6 pb-12 pt-8 md:px-10 md:pb-14 lg:px-16">
          {/* `hero-rise` is a CSS animation with fill-mode both, so each line holds
              its hidden state through its delay and never flashes in first. */}
          <div className="hero-rise" style={{ animationDelay: "0.15s" }}>
            <Badge className="border-warm/40 text-warm">Agence de solutions IT</Badge>
          </div>

          <h1
            className="hero-rise font-display text-4xl font-semibold leading-[1.06] md:whitespace-nowrap md:text-6xl xl:text-7xl"
            style={{ animationDelay: "0.27s" }}
          >
            Un univers <TypeCycle words={HEADLINE_WORDS} className="text-aqua" />
          </h1>

          {/* Muted via text-paper/NN rather than opacity-NN: `hero-rise` animates the
              opacity property to 1, which would override an opacity utility. */}
          <p
            className="hero-rise max-w-4xl text-base leading-relaxed text-paper/70 md:text-lg"
            style={{ animationDelay: "0.39s" }}
          >
            Wissal Univers conçoit les technologies qui font tourner banques, entreprises
            partenaires et particuliers : extraction de données, cloud, paiement échelonné et
            marketplace — pensés pour fonctionner ensemble.
          </p>

          <div className="hero-rise flex flex-wrap items-center gap-4" style={{ animationDelay: "0.51s" }}>
            <Button href="#solutions" variant="primary">
              Découvrir nos solutions
            </Button>
            <Button href="#contact" variant="ghost">
              Nous contacter
            </Button>
          </div>

          <p
            className="hero-rise text-xs uppercase tracking-[0.16em] text-paper/45"
            style={{ animationDelay: "0.63s" }}
          >
            Faites tourner le globe — cliquez sur une solution pour l&apos;explorer
          </p>
        </div>
      </div>
    </section>
  );
}
