"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Service } from "@/lib/types";
import type { HeroContent } from "@/lib/content/schema";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { LoadingImage } from "@/components/ui/LoadingImage";
import {
  EarthNetworkFallback,
  EarthSkyPlaceholder,
  InfraSkyPlaceholder,
  InfraStackFallback,
} from "@/components/three/fallbacks";
import { HeroVideo } from "./HeroVideo";
import { HeroSlides } from "./HeroSlides";

/*
 * The two 3D scenes are separate chunks, and only the one the owner picked in
 * /admin/site/hero is ever requested — `next/dynamic` fetches on first render, and the
 * other branch never renders. (The fallbacks are imported statically on purpose: they
 * are plain CSS and must be there before the chunk is.)
 */
const EarthNetwork = dynamic(() => import("@/components/three/EarthNetwork"), {
  ssr: false,
  loading: () => <EarthSkyPlaceholder />,
});
const InfraStack = dynamic(() => import("@/components/three/InfraStack"), {
  ssr: false,
  loading: () => <InfraSkyPlaceholder />,
});

/**
 * The right-hand side of the hero (`visual.split`% of the width on `lg`, 60 by default).
 * Five modes, one panel:
 *
 * | mode    | what fills the panel                                          |
 * | earth   | the 3D globe, solutions as markers (`EarthNetwork`)          |
 * | stack   | the 3D infrastructure stack, solutions as modules            |
 * | image   | one photo, `priority` — it is the page's LCP element          |
 * | video   | one looping muted clip, played only while on screen          |
 * | slides  | a carousel of photos and clips                                |
 *
 * The 3D modes are full-bleed and transparent over the hero's light woven ground; the
 * media modes sit in an inset, rounded dark frame that clears the navbar.
 */
export function HeroVisual({ visual, solutions }: { visual: HeroContent["visual"]; solutions: Service[] }) {
  if (visual.mode === "earth" || visual.mode === "stack") {
    return <HeroScene mode={visual.mode} solutions={solutions} />;
  }

  return (
    <div className="absolute inset-0 px-4 pb-6 pt-20 sm:px-6 lg:pb-10 lg:pl-2 lg:pr-8 lg:pt-28">
      <div className="relative h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-ink shadow-2xl">
        {visual.mode === "image" && (
          visual.image ? (
            <LoadingImage
              src={visual.image}
              alt={visual.imageAlt}
              sizes="(min-width: 1024px) 70vw, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <EmptyMedia label="Image du hero à ajouter — 2400 × 1500 px" />
          )
        )}
        {visual.mode === "video" &&
          (visual.video ? (
            <HeroVideo src={visual.video} poster={visual.videoPoster} />
          ) : (
            <EmptyMedia label="Vidéo du hero à ajouter — 16:10, MP4/WebM" />
          ))}
        {visual.mode === "slides" &&
          (visual.slides.some((s) => s.src) ? (
            <HeroSlides slides={visual.slides.filter((s) => s.src)} interval={visual.interval} />
          ) : (
            <EmptyMedia label="Diaporama vide — ajoutez des images ou vidéos" />
          ))}
      </div>
    </div>
  );
}

/** A labelled placeholder, never a broken image — same contract as every media slot. */
function EmptyMedia({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:22px_22px]" />
      <div className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
      <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-signal/15 blur-3xl" />
      <p className="relative text-xs font-semibold uppercase tracking-[0.14em] text-paper/70">{label}</p>
    </div>
  );
}

function HeroScene({ mode, solutions }: { mode: "earth" | "stack"; solutions: Service[] }) {
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);
  // The scene is the heaviest chunk on the page, and mounting it competes with
  // hydrating everything else. The sky placeholder covers the wait, so holding off
  // until the browser is idle (1.2s at the latest) lets the copy and CTAs — what the
  // visitor needs first — hydrate uncontested.
  const [mountScene, setMountScene] = useState(false);

  useEffect(() => {
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setMountScene(true), { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setMountScene(true), 200);
    return () => window.clearTimeout(id);
  }, []);

  const Scene = mode === "earth" ? EarthNetwork : InfraStack;
  const Fallback = mode === "earth" ? EarthNetworkFallback : InfraStackFallback;
  const Placeholder = mode === "earth" ? EarthSkyPlaceholder : InfraSkyPlaceholder;

  // Full-bleed and transparent over the section's own `.texture-weave` ground: the canvas
  // is `alpha: true`, the scene draws no sky of its own, and there is no dark panel and no
  // vignette. The whole hero is one light surface and the stack sits on it like a
  // technical drawing.
  //
  // No z-index on this wrapper: an absolute element with `z-auto` creates no stacking
  // context, so the label overlay (z-20) still layers above the copy scrim (z-5) while the
  // canvas stays below it.
  return (
    <div className="absolute inset-0">
      {mountScene ? (
        <ErrorBoundary label="hero-3d" fallback={<Fallback message="Aperçu 3D indisponible" />}>
          <Scene services={solutions} overlayRef={overlayRef} onSelect={(slug) => router.push(`/solutions/${slug}`)} />
        </ErrorBoundary>
      ) : (
        <Placeholder />
      )}
      {/* Portal target for the labels. It MUST share the canvas's exact bounds — drei
          positions labels relative to the canvas. */}
      <div ref={overlayRef} className="pointer-events-none absolute inset-0 z-20" />
    </div>
  );
}
