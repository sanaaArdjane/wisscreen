"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import Link from "next/link";
import { SERVICES } from "@/lib/data/services";
import type { PaletteToken, Service, ServiceStat } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { HandUnderline } from "@/components/ui/HandUnderline";
import { paletteBg, paletteText } from "@/lib/palette";
import { cn } from "@/lib/cn";
import { gsap } from "@/lib/gsap";

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

/* Same pattern, for whether the pointer can actually hover (mouse/trackpad) rather
   than only tap (touch). `GifStatsCard`'s hover-to-fullscreen tile reads this — on a
   touch device there is no real `mouseenter`/`mouseleave` pair to open and close it
   with, so without this gate a tap could open it and leave it stuck expanded. */
const CAN_HOVER_QUERY = "(hover: hover) and (pointer: fine)";
const subscribeCanHover = (onChange: () => void) => {
  const query = window.matchMedia(CAN_HOVER_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getCanHover = () => window.matchMedia(CAN_HOVER_QUERY).matches;
const getCanHoverOnServer = () => false;

/** One of the "cards" variant's three data tiles. */
function StatTile({
  service,
  index,
  value,
  label,
}: {
  service: Service;
  index: number;
  value: string;
  label: string;
}) {
  // The middle tile is the card's focal point, so it takes the signal accent — the one
  // hue on the page that isn't blue-green. The outer two carry the solution's own
  // cool pairing, which is what keeps the signal tile reading as deliberate.
  const isSignal = index === 1;
  const accent: PaletteToken =
    index === 0 ? service.palette.primary : service.palette.secondary;
  const glowClass = isSignal ? "bg-signal" : paletteBg[accent];
  const iconClass = isSignal ? "text-signal-soft" : paletteText[accent];

  return (
    <div className="relative h-60 w-full flex-1 overflow-hidden rounded-2xl border border-white/20 bg-[#26334c] p-5 shadow-2xl">
      <div
        className={cn(
          "absolute -bottom-1/4 -left-1/4 h-[115%] w-[115%] rounded-full opacity-95 blur-lg",
          glowClass,
        )}
      />
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#26334c]/25 to-[#26334c]/75" />
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:18px_18px]" />
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/15" />

      <div className="relative flex h-full flex-col justify-between">
        <Icon name={service.icon} className={cn("h-5 w-5", iconClass)} />
        <div>
          <p className="font-display text-2xl font-semibold leading-none md:text-4xl">
            {value}
          </p>
          <p className="mt-2 text-[11px] leading-snug text-paper/70 md:text-xs">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Card headline block, shared by both variants.
 *
 * `showCategory` is off for the "image" variant: the eyebrow was the one bit of
 * "card chrome" sitting on top of the photo, and dropping it leaves only the name,
 * tagline and CTA over the scrim — less to read, more of the photo left legible.
 */
function CardHeading({
  service,
  showCategory = true,
}: {
  service: Service;
  showCategory?: boolean;
}) {
  return (
    <div className="max-w-xl">
      {showCategory && (
        <p
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.14em] text-signal",
          )}
        >
          {service.category}
        </p>
      )}
      <h3
        className={cn(
          "font-display text-2xl font-semibold leading-tight md:text-4xl",
          showCategory && "mt-3",
        )}
      >
        &quot; {service.name} &quot;.{" "}
        <span className="text-paper/90">{service.tagline}</span>
      </h3>
    </div>
  );
}

function CardCta({ service }: { service: Service }) {
  return (
    <span className="relative inline-flex items-center gap-2 text-sm font-medium text-signal">
      Découvrir {service.name}
      <Icon
        name="arrow-right"
        className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
      />
    </span>
  );
}

const CARD_WIDTH = "w-[90%] sm:w-[84%] lg:w-[76%]";
const CARD_HEIGHT = "min-h-[30rem] md:min-h-[38rem]";
/** A signal hairline edge, not a neon bloom: just enough to separate one card from the
 *  next. The glow is deliberately tight (12px, tucked in by -4px) so it delineates the
 *  card rather than lighting up the section around it. rgba(19,193,130) is `signal`.
 *
 *  The edge is the brand value `#13B78C` at full strength: it is 4.05:1 against the
 *  card's own `#354666` and 3.23:1 against the lightened hover state, so the hairline
 *  keeps its 3:1 boundary in *both* states without needing a raised-surface tint. */
const CARD_SHELL = cn(
  "on-dark on-dark-raised group relative shrink-0 overflow-hidden rounded-[2rem] text-paper",
  "border border-signal/55 bg-[#354666]",
  // inset top line = lit top edge; the single outer layer is the whole glow
  "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.10),0_0_12px_-4px_rgba(19,193,130,0.45)]",
  "transition-[border-color,box-shadow,background-color] duration-500 ease-out",
  "hover:border-signal hover:bg-[#3f5578]",
  "hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.16),0_0_18px_-4px_rgba(19,193,130,0.65)]",
);

/**
 * "image" variant: the photo fills the entire card edge to edge, with the copy over it.
 *
 * **Nothing dims the photo except what the text needs.** It used to sit under a
 * full-height wash (`from-abyss/85 … to-abyss/70`) because the copy was split top and
 * bottom, and an 85% scrim over the top third meant the top third was not really showing
 * a photo at all. All the copy is anchored at the bottom now, so the scrim is a single
 * bottom-up gradient and the upper ~70% of the frame is the untouched image.
 *
 * There is no eyebrow here (see `CardHeading`'s `showCategory`) — the copy block is
 * just the name, tagline and CTA.
 *
 * The scrim is now minimal (peaks at 0.32 alpha, gone by 30% up) — a slight dark floor
 * for the copy to sit on rather than a contrast guarantee, so a busy or light photo can
 * still make the text harder to read; the photo takes priority.
 *
 * **One scale, gated by hover OR being the active card.** Both triggers target the same
 * value on the same element, so they never compound — hovering the active card doesn't
 * zoom further than either alone. The wrapper is `absolute inset-0 h-full`, which is what
 * `fill` needs and also what keeps the photo filling the card edge to edge even when the
 * row stretches taller than this card's own min-height (see `CARD_HEIGHT`'s `h-full`).
 */
function ImageCard({ service, active }: { service: Service; active: boolean }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Link
      href={`/solutions/${service.slug}`}
      className={cn(CARD_SHELL, CARD_WIDTH)}
    >
      <div className={cn("relative h-full", CARD_HEIGHT)}>
        {service.highlightImage ? (
          <>
            {!loaded && (
              <div className="skeleton-sweep absolute inset-0 overflow-hidden bg-white/5" />
            )}
            <div
              className={cn(
                // delay-0 on hover: the 1.5s hold is only for the card's own auto turn,
                // hovering (any card) should zoom right away.
                "absolute inset-0 transition-transform duration-700 ease-out delay-[800ms] motion-reduce:transition-none motion-reduce:delay-0",
                active ? "scale-[1.07]" : "scale-100",
                "group-hover:scale-[1.07] group-hover:delay-0 motion-reduce:scale-100",
              )}
            >
              <Image
                src={service.highlightImage}
                alt={`Aperçu de ${service.name}`}
                fill
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 84vw, 76vw"
                className={cn(
                  "object-cover transition-opacity duration-700 ease-out",
                  loaded ? "opacity-100" : "opacity-0",
                )}
                onLoad={() => setLoaded(true)}
              />
            </div>
          </>
        ) : (
          <div className="absolute inset-0">
            <div
              className={cn(
                "absolute -bottom-1/4 -left-1/4 h-[120%] w-[80%] rounded-full opacity-55 blur-3xl",
                paletteBg[service.palette.primary],
              )}
            />
            <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-teal/25 blur-3xl" />
            <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
              {/* `/70`, not `/55`: at 55% this lands at 4.14:1 on the card, under the
                  floor. It only showed up once the audit stopped mis-parsing `lab()`. */}
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-paper/70">
                Visuel plein cadre à venir — 2400 × 1200 px
              </p>
            </div>
          </div>
        )}

        {/* A slightly stronger dark floor than the bare minimum, still fading out well
            before the photo's midpoint. */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(38,51,76,0.55)_0%,rgba(38,51,76,0.28)_20%,transparent_38%)]" />

        {/* absolute inset-0, not h-full: the parent only has a min-height, so a
            percentage height would collapse and the copy would not sit on the floor. */}
        <div className="absolute inset-0 flex flex-col justify-end gap-6 p-8 md:p-12">
          <CardHeading service={service} showCategory={false} />
          <CardCta service={service} />
        </div>
      </div>
    </Link>
  );
}

/** "cards" variant: copy at the top, three data tiles centred below it. */
function StatsCard({ service }: { service: Service }) {
  return (
    <Link
      href={`/solutions/${service.slug}`}
      className={cn(CARD_SHELL, CARD_WIDTH)}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.4)_1px,transparent_0)] [background-size:32px_32px]" />
        <div
          className={cn(
            "absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-25 blur-3xl",
            paletteBg[service.palette.primary],
          )}
        />
        <div
          className={cn(
            "absolute -bottom-28 -left-20 h-80 w-80 rounded-full opacity-20 blur-3xl",
            paletteBg[service.palette.secondary],
          )}
        />
      </div>

      <div
        className={cn("relative flex h-full flex-col p-8 md:p-12", CARD_HEIGHT)}
      >
        <CardHeading service={service} />

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="flex w-full items-stretch justify-center gap-4 md:gap-6">
            {service.stats.slice(0, 3).map((stat, i) => (
              <StatTile
                key={stat.label}
                service={service}
                index={i}
                value={stat.value}
                label={stat.label}
              />
            ))}
          </div>
        </div>

        <CardCta service={service} />
      </div>
    </Link>
  );
}

/**
 * The tile's actual content — image/mock, scrim, icon, value, label. Shared verbatim
 * between `GifStatTile` (the static, in-flow tile) and `GifStatsCard`'s reveal overlay,
 * so the overlay is a pixel-identical clone of the tile it sits on. That's what makes
 * the reveal read as the image itself expanding rather than a second layer fading in:
 * at rest the overlay exactly overlaps its tile (same crop, same icon, same text) with
 * full opacity, so there is nothing to cross-fade — growing it just pushes that same
 * opaque content further out, erasing whatever is behind it as it goes.
 */
function GifTileVisual({
  service,
  index,
  stat,
}: {
  service: Service;
  index: number;
  stat: ServiceStat;
}) {
  const isSignal = index === 1;
  const accent: PaletteToken =
    index === 0 ? service.palette.primary : service.palette.secondary;
  const glowClass = isSignal ? "bg-signal" : paletteBg[accent];
  const iconClass = isSignal ? "text-signal-soft" : paletteText[accent];

  return (
    <>
      {stat.gif ? (
        <img
          src={stat.gif}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0">
          <div
            className={cn(
              "absolute -bottom-1/4 -left-1/4 h-[115%] w-[115%] rounded-full opacity-95 blur-lg",
              glowClass,
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#26334c]/25 to-[#26334c]/75" />
          <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:18px_18px]" />
        </div>
      )}
      {/* Bottom-anchored scrim only — same technique as ImageCard — so a real photo
          stays legible instead of being washed out. */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#131c2c]/85 via-[#131c2c]/15 to-transparent" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/15" />

      <div className="relative flex h-full flex-col justify-between p-5">
        <Icon name={service.icon} className={cn("h-5 w-5", iconClass)} />
        <div>
          <p className="font-display text-2xl font-semibold leading-none md:text-4xl">
            {stat.value}
          </p>
          <p className="mt-2 line-clamp-2 text-[11px] leading-snug text-paper/70 md:text-xs">
            {stat.label}
          </p>
        </div>
      </div>
    </>
  );
}

/** One tile of the "cards-gif" variant — a static, in-flow square. Its own visual is
 *  what stays on screen at rest; the reveal overlay (see `GifStatsCard`) is a clone of
 *  it stacked exactly on top. */
function GifStatTile({
  service,
  index,
  stat,
  onEnter,
  tileRef,
}: {
  service: Service;
  index: number;
  stat: ServiceStat;
  onEnter: () => void;
  tileRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={tileRef}
      onMouseEnter={onEnter}
      className="relative h-[17rem] w-full flex-1 overflow-hidden rounded-2xl border border-white/20 bg-[#26334c] shadow-2xl"
    >
      <GifTileVisual service={service} index={index} stat={stat} />
    </div>
  );
}

/**
 * Mobile-only replacement for the three-tile row (`sm:hidden`, the row itself is
 * `hidden` below `sm` — see `GifStatsCard`). Squeezing three tiles into a narrow card
 * or turning them into tiny swipeable squares both under-used the space; this instead
 * gives the photos the *whole* card width, one at a time, auto-advancing every
 * second — and taps the same "erase to reveal" idea from the desktop hover as a tap:
 * a stats panel slides up from the bottom and covers the photos, rather than a
 * separate page or a modal.
 *
 * It sits inside `GifStatsCard`'s `Link`, so its own tap has to be caught before it
 * bubbles there — `stopPropagation` (not just `preventDefault`) is what actually stops
 * it, since Next's Link navigates from its own `onClick`, not the browser default.
 * `role="button"`, not a real `<button>`, on purpose: a `<button>` nested in an `<a>`
 * is invalid HTML (interactive content can't nest) even though browsers render it.
 */
function GifMobileSlideshow({
  service,
  stats,
}: {
  service: Service;
  stats: ServiceStat[];
}) {
  const [active, setActive] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    getReduceMotion,
    getReduceMotionOnServer,
  );

  useEffect(() => {
    if (revealed || reduceMotion) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % stats.length);
    }, 3000);
    return () => clearInterval(id);
  }, [revealed, reduceMotion, stats.length]);

  const toggle = (e: MouseEvent | KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRevealed((r) => !r);
  };

  return (
    <div className="w-full sm:hidden">
      <div
        role="button"
        tabIndex={0}
        aria-pressed={revealed}
        aria-label={
          revealed
            ? `Masquer les statistiques de ${service.name}`
            : `Afficher les statistiques de ${service.name}`
        }
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") toggle(e);
        }}
        className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden rounded-2xl border border-white/20 bg-[#26334c] shadow-2xl"
      >
        {/* Exactly one image in the DOM at a time — swapping `src`/content outright
            on the 1s tick, not cross-fading 3 stacked layers. Overlapping two
            partially-transparent copies of near-identical photos read as a glitchy
            double-exposure rather than a clean cycle, especially at the placeholder
            GIF's native size. A hard cut has nothing to overlap. */}
        {stats[active]?.gif ? (
          <img
            src={stats[active].gif}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-abyss">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-paper/60">
              Démo à venir
            </p>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#131c2c]/70 via-transparent to-transparent" />

        {/* Which photo is showing, and a nudge that the card is tappable. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5">
          {stats.map((stat, i) => (
            <span
              key={stat.label}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                active === i ? "w-4 bg-signal" : "w-1.5 bg-white/40",
              )}
            />
          ))}
        </div>

        {/* The stats panel — rises to fully cover the photos, and back down again. */}
        <div
          className={cn(
            "absolute inset-0 flex flex-col justify-center gap-4 bg-abyss p-6 transition-transform duration-500 ease-out motion-reduce:transition-none",
            revealed ? "translate-y-0" : "translate-y-full",
          )}
        >
          {stats.map((stat) => (
            <div key={stat.label}>
              <p className="font-display text-2xl font-semibold leading-none text-paper">
                {stat.value}
              </p>
              <p className="mt-1 text-xs leading-snug text-paper/70">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * "cards-gif" variant: the same copy-and-stats layout as "cards", but each tile is a
 * photo/GIF background. Hovering a tile **erases the rest of the card with it** rather
 * than cross-fading anything in: a clone of the tile (`GifTileVisual`, opaque, never
 * touched by an opacity tween) sits stacked exactly on top of it at all times — a
 * `useLayoutEffect` snaps every clone to its tile's live `getBoundingClientRect()`
 * before the first paint, so at rest the two are indistinguishable. Hovering just
 * GSAP-tweens that clone's `left/top/width/height` out to the card's own rect
 * (`power2.out`, slow and smooth); since it's already fully opaque, growing it simply
 * covers more of the card as it goes — heading, CTA, other tiles — with a hard edge,
 * not a fade.
 *
 * Animating the real box, not a `scale()`, matters here too: the tile is square and
 * the card isn't, so a transform scale would distort the photo; resizing the box lets
 * `object-cover` recompute the crop every frame, reading as a clean expand instead of
 * a stretch.
 *
 * **Closing is a card-level `mouseleave`, not a tile-level one.** Once a tile's clone
 * has grown to fill the card, the pointer is visually "inside the photo" everywhere —
 * tying the shrink to the tiny original tile's bounds meant it snapped shut the moment
 * you moved off that original square, even though you were still deep inside the
 * enlarged image. It only shrinks once the cursor actually leaves the whole card.
 *
 * **A tile can only open while nothing else is already open.** The clone is
 * `pointer-events-none` so the real tile underneath still receives hover — which is
 * exactly the problem for the *other two* tiles once one is expanded: they sit right
 * behind the now-huge photo, and moving the cursor over their (invisible) position used
 * to silently swap the zoom to them, as if the pointer could see through the image. The
 * `onEnter` passed to each tile ignores the event unless `hovered === null`, so a tile
 * can only ever start growing while it's actually visible at rest — switching to a
 * different one now requires leaving the card first.
 *
 * **z-index is held for the entire shrink, not dropped the instant the mouse leaves.**
 * It's managed by GSAP, not React state: `growOverlay` sets it to 10 immediately,
 * `shrinkOverlay` only sets it back to 0 in the tween's `onComplete`. Dropping it
 * up front (e.g. via a `hovered === i` class) meant the still-shrinking, still-huge
 * clone tied in z-index with the other two (both back at 0) the instant the mouse
 * left, and — same stacking-order rule as the erase bug — the later ones in this map
 * painted over it, so you'd see the other two tiles pop back in *while* this one was
 * still visibly mid-shrink.
 */
function GifStatsCard({ service }: { service: Service }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const stats = service.stats.slice(0, 3);

  const cardRef = useRef<HTMLAnchorElement>(null);
  const tileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const overlayRefs = useRef<(HTMLDivElement | null)[]>([]);

  const reduceMotion = useSyncExternalStore(
    subscribeReduceMotion,
    getReduceMotion,
    getReduceMotionOnServer,
  );
  const canHover = useSyncExternalStore(
    subscribeCanHover,
    getCanHover,
    getCanHoverOnServer,
  );

  // Snap every clone onto its tile before the browser paints, so there is never a
  // frame where it's visible at the wrong size — a plain useEffect would flash the
  // fallback (top-left, tiny) className state first.
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const cardRect = card.getBoundingClientRect();
    tileRefs.current.forEach((tile, i) => {
      const overlay = overlayRefs.current[i];
      if (!tile || !overlay) return;
      const tileRect = tile.getBoundingClientRect();
      gsap.set(overlay, {
        left: tileRect.left - cardRect.left,
        top: tileRect.top - cardRect.top,
        width: tileRect.width,
        height: tileRect.height,
        opacity: 1,
        zIndex: 0,
      });
    });
  }, []);

  const growOverlay = useCallback(
    (i: number) => {
      const overlay = overlayRefs.current[i];
      const card = cardRef.current;
      if (!overlay || !card) return;
      const cardRect = card.getBoundingClientRect();

      gsap.killTweensOf(overlay);
      gsap.set(overlay, { zIndex: 10 });
      gsap.to(overlay, {
        left: 0,
        top: 0,
        width: cardRect.width,
        height: cardRect.height,
        duration: reduceMotion ? 0 : 0.85,
        ease: "power2.out",
      });
    },
    [reduceMotion],
  );

  const shrinkOverlay = useCallback(
    (i: number) => {
      const tile = tileRefs.current[i];
      const overlay = overlayRefs.current[i];
      const card = cardRef.current;
      if (!tile || !overlay || !card) return;

      const tileRect = tile.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      gsap.killTweensOf(overlay);
      gsap.to(overlay, {
        left: tileRect.left - cardRect.left,
        top: tileRect.top - cardRect.top,
        width: tileRect.width,
        height: tileRect.height,
        duration: reduceMotion ? 0 : 0.5,
        ease: "power2.inOut",
        onComplete: () => gsap.set(overlay, { zIndex: 0 }),
      });
    },
    [reduceMotion],
  );

  // Only called while nothing else is open (gated where it's wired to each tile's
  // `onEnter`, below) — a tile whose clone is hidden behind another one's expanded
  // clone must not be openable at all. The real tiles stay in the DOM the whole time
  // (so `onMouseLeave` on the card still works), and the covering clone is
  // `pointer-events-none`, so without this gate hovering *over* an obscured tile's
  // real position — which visually shows nothing but the other tile's photo — used to
  // silently swap the zoom to it, as if the cursor could see through the photo.
  const openTile = useCallback(
    (i: number) => {
      growOverlay(i);
      setHovered(i);
    },
    [growOverlay],
  );

  const closeCard = useCallback(() => {
    if (hovered !== null) shrinkOverlay(hovered);
    setHovered(null);
  }, [hovered, shrinkOverlay]);

  return (
    <Link
      href={`/solutions/${service.slug}`}
      ref={cardRef}
      onMouseLeave={closeCard}
      className={cn(CARD_SHELL, CARD_WIDTH)}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.4)_1px,transparent_0)] [background-size:32px_32px]" />
        <div
          className={cn(
            "absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-25 blur-3xl",
            paletteBg[service.palette.primary],
          )}
        />
        <div
          className={cn(
            "absolute -bottom-28 -left-20 h-80 w-80 rounded-full opacity-20 blur-3xl",
            paletteBg[service.palette.secondary],
          )}
        />
      </div>

      <div
        className={cn("relative flex h-full flex-col p-8 md:p-12", CARD_HEIGHT)}
      >
        <CardHeading service={service} />

        <div className="flex flex-1 items-center py-6 sm:py-10">
          <GifMobileSlideshow service={service} stats={stats} />

          {/* Desktop/hover-capable only — see GifMobileSlideshow for the mobile
              replacement. */}
          <div className="hidden w-full items-stretch justify-center gap-4 sm:flex md:gap-6">
            {stats.map((stat, i) => (
              <GifStatTile
                key={stat.label}
                service={service}
                index={i}
                stat={stat}
                tileRef={(el) => {
                  tileRefs.current[i] = el;
                }}
                onEnter={() => {
                  // Ignore a touch device (no real hover to close it with again) and
                  // an obscured tile — only a tile that's actually visible at rest,
                  // on a pointer that can actually hover, may start growing.
                  if (canHover && hovered === null) openTile(i);
                }}
              />
            ))}
          </div>
        </div>

        <CardCta service={service} />
      </div>

      {/* One reveal clone per tile, stacked on top of it. Positioned/sized *and*
          z-indexed entirely by GSAP (the mount effect, then growOverlay/shrinkOverlay)
          — the `opacity-0`/`z-0` defaults only cover the case where JS never runs. */}
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          ref={(el) => {
            overlayRefs.current[i] = el;
          }}
          aria-hidden={hovered !== i}
          className="pointer-events-none absolute left-0 top-0 z-0 h-full w-full overflow-hidden rounded-[2rem] opacity-0"
        >
          <GifTileVisual service={service} index={i} stat={stat} />
        </div>
      ))}
    </Link>
  );
}

function HighlightCard({
  service,
  active,
}: {
  service: Service;
  active: boolean;
}) {
  // Explicit per-service choice; falls back to the data tiles.
  if (service.highlightVariant === "image") {
    return <ImageCard service={service} active={active} />;
  }
  if (service.highlightVariant === "cards-gif") {
    return <GifStatsCard service={service} />;
  }
  return <StatsCard service={service} />;
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
  // Pausing (not resetting) on hover: the countdown just holds wherever it was and
  // picks back up when the cursor leaves, so a visitor reading a card doesn't have it
  // flip away mid-read, but doesn't lose their place either.
  const [hoverPaused, setHoverPaused] = useState(false);
  const autoplay = inView && playing && !reduceMotion && !hoverPaused;

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
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 42%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 42%, transparent 100%)",
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
            <HandUnderline
              className={underlined ? "underline-draw" : "opacity-0"}
            />
          </span>
          , en un coup d&apos;œil.
        </h2>
        <Link
          href="#solutions"
          className="group inline-flex items-center gap-2 text-sm font-medium text-paper/70 transition-colors hover:text-aqua"
        >
          Voir toutes nos solutions
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current">
            <Icon
              name="arrow-right"
              className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
            />
          </span>
        </Link>
      </Container>

      {/* Full-bleed carousel: the first card lines up with the heading, later cards
          bleed off the right edge. `relative` is needed because the dot overlay above
          is absolutely positioned, so static siblings would paint underneath it. */}
      <div
        className="carousel-inset relative mt-12 overflow-hidden"
        ref={emblaRef}
        onMouseEnter={() => setHoverPaused(true)}
        onMouseLeave={() => setHoverPaused(false)}
      >
        <div className="flex gap-5 md:gap-7">
          {SERVICES.map((service, i) => (
            <HighlightCard
              key={service.slug}
              service={service}
              active={i === selected}
            />
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
                  isActive
                    ? "w-12 bg-white/25"
                    : "w-1.5 bg-white/40 hover:bg-white/70",
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
          aria-label={
            autoplay
              ? "Mettre en pause le défilement"
              : "Reprendre le défilement"
          }
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-paper transition-colors hover:bg-white/20"
        >
          {autoplay ? (
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="7" y="5" width="3.5" height="14" rx="1" />
              <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="ml-0.5 h-4 w-4"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
    </section>
  );
}
