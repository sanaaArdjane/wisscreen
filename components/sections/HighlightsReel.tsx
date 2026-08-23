"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import Link from "next/link";
import { SERVICES } from "@/lib/data/services";
import type { PaletteToken, Service } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { paletteBg, paletteText } from "@/lib/palette";
import { cn } from "@/lib/cn";

/** How long each highlight card holds before auto-advancing. */
const SLIDE_MS = 6500;
const TICK_MS = 50;

/* Reduced-motion read via useSyncExternalStore: it's the idiomatic way to subscribe
   to a browser API without a setState-in-effect, and its server snapshot keeps
   hydration consistent. Defined at module scope so the references stay stable. */
const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReduceMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCE_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getReduceMotion = () => window.matchMedia(REDUCE_MOTION_QUERY).matches;
const getReduceMotionOnServer = () => false;

/** One of the "cards" variant's three data tiles. */
function StatTile({ service, index, value, label }: { service: Service; index: number; value: string; label: string }) {
  // The middle tile is the card's focal point, so it takes the warm accent — the one
  // hue on the page that isn't blue-green. The outer two carry the solution's own
  // cool pairing, which is what keeps the warm tile reading as deliberate.
  const warm = index === 1;
  const accent: PaletteToken = index === 0 ? service.palette.primary : service.palette.secondary;
  const glowClass = warm ? "bg-ember" : paletteBg[accent];
  const iconClass = warm ? "text-ember-soft" : paletteText[accent];

  return (
    <div className="relative aspect-square w-full max-w-[15rem] flex-1 overflow-hidden rounded-2xl border border-white/20 bg-[#26334c] p-5 shadow-2xl">
      <div className={cn("absolute -bottom-1/4 -left-1/4 h-[115%] w-[115%] rounded-full opacity-95 blur-lg", glowClass)} />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#26334c]/25 to-[#26334c]/75" />
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:18px_18px]" />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15" />

      <div className="relative flex h-full flex-col justify-between">
        <Icon name={service.icon} className={cn("h-5 w-5", iconClass)} />
        <div>
          <p className="font-display text-2xl font-semibold leading-none md:text-4xl">{value}</p>
          <p className="mt-2 text-[11px] leading-snug text-paper/70 md:text-xs">{label}</p>
        </div>
      </div>
    </div>
  );
}

/** Card headline block, shared by both variants. */
function CardHeading({ service }: { service: Service }) {
  return (
    <div className="max-w-xl">
      <p
        className={cn(
          "text-xs font-semibold uppercase tracking-[0.14em] text-warm",
        )}
      >
        {service.category}
      </p>
      <h3 className="font-display mt-3 text-2xl font-semibold leading-tight md:text-4xl">
        {service.name}. <span className="text-paper/75">{service.tagline}</span>
      </h3>
    </div>
  );
}

function CardCta({ service }: { service: Service }) {
  return (
    <span className="relative inline-flex items-center gap-2 text-sm font-medium text-warm">
      Découvrir {service.name}
      <Icon name="arrow-right" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
    </span>
  );
}

const CARD_WIDTH = "w-[90%] sm:w-[84%] lg:w-[76%]";
const CARD_HEIGHT = "min-h-[30rem] md:min-h-[38rem]";
/** A warm hairline edge, not a neon bloom: just enough to separate one card from the
 *  next. The glow is deliberately tight (12px, tucked in by -4px) so it delineates the
 *  card rather than lighting up the section around it. rgba(197,82,44) is `ember`. */
const CARD_SHELL = cn(
  "on-dark on-dark-raised group relative shrink-0 overflow-hidden rounded-[2rem] text-paper",
  "border border-ember/55 bg-[#354666]",
  // inset top line = lit top edge; the single outer layer is the whole glow
  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_0_12px_-4px_rgba(197,82,44,0.45)]",
  "transition-[border-color,box-shadow,background-color] duration-500 ease-out",
  "hover:border-ember hover:bg-[#3f5578]",
  "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_0_18px_-4px_rgba(197,82,44,0.65)]",
);

/**
 * "image" variant: the photo fills the entire card edge to edge, with the copy laid
 * over it. A scrim behind the text keeps it legible on any photo.
 */
function ImageCard({ service }: { service: Service }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Link href={`/solutions/${service.slug}`} className={cn(CARD_SHELL, CARD_WIDTH)}>
      <div className={cn("relative", CARD_HEIGHT)}>
        {service.highlightImage ? (
          <>
            {!loaded && <div className="skeleton-sweep absolute inset-0 overflow-hidden bg-white/5" />}
            <Image
              src={service.highlightImage}
              alt={`Aperçu de ${service.name}`}
              fill
              sizes="(max-width: 640px) 90vw, (max-width: 1024px) 84vw, 76vw"
              className={cn(
                "object-cover transition-[opacity,transform] duration-700 ease-out group-hover:scale-[1.04]",
                loaded ? "opacity-100" : "opacity-0",
              )}
              onLoad={() => setLoaded(true)}
            />
          </>
        ) : (
          <div className="absolute inset-0">
            <div className={cn("absolute -bottom-1/4 -left-1/4 h-[120%] w-[80%] rounded-full opacity-55 blur-3xl", paletteBg[service.palette.primary])} />
            <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-teal/25 blur-3xl" />
            <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-paper/55">
                Visuel plein cadre à venir — 2400 × 1200 px
              </p>
            </div>
          </div>
        )}

        {/* Scrim: darkens the top where the copy sits, and the bottom for the CTA */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-abyss/85 via-abyss/25 to-abyss/70" />

        {/* absolute inset-0, not h-full: the parent only has a min-height, so a
            percentage height would collapse and justify-between wouldn't spread. */}
        <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-12">
          <CardHeading service={service} />
          <CardCta service={service} />
        </div>
      </div>
    </Link>
  );
}

/** "cards" variant: copy at the top, three data tiles centred below it. */
function StatsCard({ service }: { service: Service }) {
  return (
    <Link href={`/solutions/${service.slug}`} className={cn(CARD_SHELL, CARD_WIDTH)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.4)_1px,transparent_0)] [background-size:32px_32px]" />
        <div className={cn("absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-25 blur-3xl", paletteBg[service.palette.primary])} />
        <div className={cn("absolute -bottom-28 -left-20 h-80 w-80 rounded-full opacity-20 blur-3xl", paletteBg[service.palette.secondary])} />
      </div>

      <div className={cn("relative flex flex-col p-8 md:p-12", CARD_HEIGHT)}>
        <CardHeading service={service} />

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="flex w-full max-w-3xl items-stretch justify-center gap-4 md:gap-6">
            {service.stats.slice(0, 3).map((stat, i) => (
              <StatTile key={stat.label} service={service} index={i} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>

        <CardCta service={service} />
      </div>
    </Link>
  );
}

function HighlightCard({ service }: { service: Service }) {
  // Explicit per-service choice; falls back to the data tiles.
  return service.highlightVariant === "image" ? (
    <ImageCard service={service} />
  ) : (
    <StatsCard service={service} />
  );
}

export function HighlightsReel() {
  // align "start": the active card snaps to the container's left edge rather than
  // being centred, so the deck reads as a row starting under the heading.
  // loop is off deliberately — in loop mode Embla parks the previous slide just
  // outside the viewport, which would show a sliver of it inside the left inset.
  // The autoplay tick wraps back to the first card instead.
  // containScroll:false keeps one snap per slide so the dots map 1:1 to the cards —
  // "trimSnaps" collapses the trailing snaps and leaves the last dots unreachable.
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: false,
    containScroll: false,
  });
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
    progressRef.current = 0;
    setProgress(0);
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  // Draw the underline the first time the heading scrolls into view. setState lives
  // in the observer callback, so this stays clear of the setState-in-effect rule.
  const underlineRef = useRef<HTMLSpanElement>(null);
  const [underlined, setUnderlined] = useState(false);

  useEffect(() => {
    const el = underlineRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setUnderlined(true);
          observer.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* The deck stays parked until the section is actually on screen — otherwise it burns
     through its cards while the visitor is still up in the hero, and they arrive at card
     3 with the countdown mid-cycle. Leaving view stops it and resets the countdown, so
     coming back always starts a fresh card.

     rootMargin rather than a threshold: this section is usually TALLER than the viewport,
     so its intersection ratio can never reach a value like 0.35 on a short window and the
     deck would never start. Insetting the root by 20% top and bottom asks "does the
     section overlap the middle 60% of the viewport", which holds at any section height. */
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? false;
        setInView(visible);
        if (!visible) {
          progressRef.current = 0;
          setProgress(0);
        }
      },
      { rootMargin: "-20% 0px -20% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    getReduceMotion,
    getReduceMotionOnServer,
  );
  const autoplay = inView && playing && !reduceMotion;

  useEffect(() => {
    if (!autoplay || !emblaApi) return;
    const id = setInterval(() => {
      progressRef.current += (TICK_MS / SLIDE_MS) * 100;
      if (progressRef.current >= 100) {
        progressRef.current = 0;
        // Wrap manually since looping is disabled.
        if (emblaApi.canScrollNext()) emblaApi.scrollNext();
        else emblaApi.scrollTo(0);
      }
      setProgress(progressRef.current);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [autoplay, emblaApi]);

  return (
    <section
      ref={sectionRef}
      id="highlights"
      className="relative overflow-hidden bg-abyss pb-24 pt-28 text-paper md:pb-32 md:pt-36"
    >
      {/* The hero's globe reads as continuing *behind* this section: a wide, very soft
          limb glow bleeding down over the top edge, fading back to the section ground.
          Paired with the hero's own bottom falloff, the earth dissolves into the
          background exactly where the copy begins instead of being cut off at the seam.
          Overflow-hidden keeps the oversized ellipses from forcing a scrollbar.

          This sits BEFORE the dot overlay on purpose. An opaque gradient here would
          hide this section's dots while the hero's stay visible, and that texture
          discontinuity draws a hard line across the seam — the very thing it's meant
          to remove. Behind the dots, the texture runs unbroken through the fade. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden md:h-[26rem]"
        // Masked to zero at the very top edge. Without this the glow starts abruptly
        // AT the boundary, so the hero side (no glow) and this side (full glow) differ
        // by a step and draw exactly the hard line the vignette exists to remove.
        // Ramping from nothing means both sides agree on the seam itself.
        style={{
          maskImage: "linear-gradient(to bottom, transparent 0%, black 42%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 42%, transparent 100%)",
        }}
      >
        <div className="absolute -top-40 left-1/2 h-[34rem] w-[80rem] -translate-x-1/2 rounded-[50%] bg-steel/35 blur-3xl" />
        <div className="absolute -top-24 left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-[50%] bg-teal/20 blur-3xl" />
      </div>

      {/* Same ground as the hero's falloff, so the two sections read as one continuous
          surface — the dot texture carries through instead of a colour transition. */}
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:30px_30px]" />

      <Container className="relative flex flex-wrap items-end justify-between gap-6">
        <h2 className="font-display text-4xl font-semibold leading-tight text-paper md:text-6xl">
          <span ref={underlineRef} className="relative inline-block">
            L&apos;essentiel
            {/* Hand-drawn underline. Kept as inline SVG rather than a background-image
                data URL so the stroke can be filled with a palette token. */}
            <svg
              viewBox="0 0 1418 125"
              preserveAspectRatio="none"
              aria-hidden="true"
              className={cn(
                "absolute left-0 top-full h-[0.3em] w-full -translate-y-[0.09em]",
                underlined ? "underline-draw" : "opacity-0",
              )}
            >
              <path
                d="M1412.29 72.17c-11.04-5.78-20.07-14.33-85.46-25.24-22.37-3.63-44.69-7.56-67.07-11.04-167.11-22.06-181.65-21.24-304.94-30.56C888.78 1.39 822.57 1.1 756.44 0c-46.63-.11-93.27 1.56-139.89 2.5C365.5 13.55 452.86 7.68 277.94 23.15 202.57 33.32 127.38 45.01 52.07 55.69c-11.23 2.41-22.63 4.17-33.71 7.22C6.1 66.33 5.64 66.19 3.89 67.79c-7.99 5.78-2.98 20.14 8.72 17.5 33.99-9.47 32.28-8.57 178.06-29.66 4.26 4.48 7.29 3.38 18.42 3.11 13.19-.32 26.38-.53 39.56-1.12 53.51-3.81 106.88-9.62 160.36-13.95 18.41-1.3 36.8-3.12 55.21-4.7 23.21-1.16 46.43-2.29 69.65-3.4 120.28-2.16 85.46-3.13 234.65-1.52 23.42.99 1.57-.18 125.72 6.9 96.61 8.88 200.92 27.94 295.42 46.12 40.87 7.91 116.67 23.2 156.31 36.78 3.81 1.05 8.28-.27 10.51-3.58 3.17-3.72 2.66-9.7-.78-13.13-3.25-3.12-8.14-3.44-12.18-5.08-17.89-5.85-44.19-12.09-63.67-16.56l26.16 3.28c23.02 3.13 46.28 3.92 69.34 6.75 10.8.96 25.43 1.81 34.34-4.39 2.26-1.54 4.86-2.75 6.21-5.27 2.76-4.59 1.13-11.06-3.59-13.68ZM925.4 23.77c37.64 1.4 153.99 10.85 196.64 14.94 45.95 5.51 91.89 11.03 137.76 17.19 24.25 4.77 74.13 11.21 101.72 18.14-11.87-1.15-23.77-1.97-35.65-3.06-133.46-15.9-266.8-33.02-400.47-47.21Z"
                className="fill-warm"
              />
            </svg>
          </span>
          , en un coup d&apos;œil.
        </h2>
        <Link
          href="#solutions"
          className="group inline-flex items-center gap-2 text-sm font-medium text-paper/70 transition-colors hover:text-aqua"
        >
          Voir toutes nos solutions
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current">
            <Icon name="arrow-right" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
          </span>
        </Link>
      </Container>

      {/* Full-bleed carousel: the first card lines up with the heading, later cards
          bleed off the right edge. `relative` is needed because the dot overlay above
          is absolutely positioned, so static siblings would paint underneath it. */}
      <div className="carousel-inset relative mt-12 overflow-hidden" ref={emblaRef}>
        <div className="flex gap-5 md:gap-7">
          {SERVICES.map((service) => (
            <HighlightCard key={service.slug} service={service} />
          ))}
        </div>
      </div>

      {/* Progress pill + play/pause, centred under the deck */}
      <div className="relative mt-10 flex items-center justify-center gap-4">
        <div className="flex items-center gap-2.5 rounded-full bg-white/10 px-4 py-3">
          {SERVICES.map((service, i) => {
            const isActive = i === selected;
            return (
              <button
                key={service.slug}
                type="button"
                onClick={() => emblaApi?.scrollTo(i)}
                aria-label={`Voir ${service.name}`}
                aria-current={isActive}
                className={cn(
                  "relative h-1.5 overflow-hidden rounded-full transition-all duration-500",
                  isActive ? "w-12 bg-white/25" : "w-1.5 bg-white/40 hover:bg-white/70",
                )}
              >
                {isActive && (
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-paper"
                    style={{ width: `${autoplay ? progress : 100}%` }}
                  />
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          aria-label={autoplay ? "Mettre en pause le défilement" : "Reprendre le défilement"}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-paper transition-colors hover:bg-white/20"
        >
          {autoplay ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
              <rect x="7" y="5" width="3.5" height="14" rx="1" />
              <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
    </section>
  );
}
