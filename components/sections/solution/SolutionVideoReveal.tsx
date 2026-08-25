"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { RefObject } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import type { Service } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { paletteBg } from "@/lib/palette";
import { lockScroll } from "@/lib/scrollLock";
import { cn } from "@/lib/cn";

/**
 * The presentation video, opening as a centred card and stretching to full-bleed as the
 * section is scrolled — the Apple product-page beat: a small rounded window enters from
 * the bottom, grows until it *is* the viewport, and starts playing at the moment it gets
 * there.
 *
 * **The growth is mapped to the section arriving, not to the pinned track.** The trigger
 * starts at "top bottom", so the card grows while the section rises into view and is
 * full-bleed exactly when the stage pins — by the time you are looking at the section it is
 * already the whole viewport, and the rest of the track is dwell time on a playing video.
 *
 * That is also why the "réduire" button is a real override rather than a scroll jump the
 * way `DeviceShowcase`'s tabs are. With growth tied to arrival, every scroll offset that
 * would show a small card has the stage half below the fold, so there is no position to
 * scroll to that frames one. `manual` therefore wins over the scroll until it is toggled
 * back — the one deliberate exception to the single-source-of-truth rule here.
 *
 * The ground is **textured paper**, and the frame carries `on-dark` itself: it is the dark
 * surface, so the accent variables have to be overridden there rather than on the section.
 *
 * **The geometry is written as explicit px, not a `scale()`.** A scaled card would take
 * its border radius, its chrome and any text inside it along for the ride, so the corners
 * would flatten out and the copy would balloon. Interpolating width and height keeps every
 * child at its own size and lets the radius resolve to 0 on its own curve — which is what
 * makes the end state read as "the page", not as "a big card".
 *
 * Playback is gated on **being both in view and stretched**: a card playing at 20% of the
 * viewport is noise, and a visitor who has scrolled past has no reason to keep a video
 * decoding. The play button is a tri-state override (`override ?? stretched`) so either
 * decision can be taken back.
 *
 * Fullscreen is the Fullscreen API plus a `fixed` overlay, for the same reason as the hero
 * frame — iOS Safari has no element fullscreen. The frame's inline geometry is *cleared*
 * on the way in (and `paint` short-circuits while it is up), because inline px would
 * otherwise beat the UA's fullscreen sizing and leave a card floating on a black screen.
 */

/* The growth is mapped to the section **arriving**, not to the pinned track: the trigger
   runs from "top bottom" (section top at the viewport's bottom edge) to "bottom bottom", so
   progress `pin = innerHeight / sectionHeight` is exactly the moment the stage pins. The
   frame finishes growing there — by the time the section is in place it is already
   full-bleed, and everything after is dwell time on a playing video.

   `pin` is measured per frame rather than hardcoded because it depends on the viewport:
   the section's height is in `svh`, but `innerHeight` on a phone moves with the URL bar.

   Both windows are expressed as fractions of `pin`. */
const GROW_START = 0.12;
const COPY_START = 0.62;
/** How far past `pin` the copy keeps fading in, in absolute progress. */
const COPY_TAIL = 0.05;
/** How stretched the frame has to be before the video starts on its own. */
const AUTOPLAY_AT = 0.9;

/* The resting card, as fractions of the stage. Width-led, then height-capped so a short
   window doesn't get a card taller than the room above the fold. */
const CARD_WIDTH = 0.74;
const CARD_HEIGHT_MAX = 0.66;
const CARD_ASPECT = 16 / 9;
/** Corner radius of the resting card, in px; it resolves to 0 at full bleed. */
const CARD_RADIUS = 26;

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReduceMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCE_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getReduceMotion = () => window.matchMedia(REDUCE_MOTION_QUERY).matches;
const getReduceMotionOnServer = () => false;

type Manual = null | "card" | "full";

const ramp = (p: number, [a, b]: readonly [number, number]) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

export function SolutionVideoReveal({ service }: { service: Service }) {
  const reduceMotion = useSyncExternalStore(subscribeReduceMotion, getReduceMotion, getReduceMotionOnServer);

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  /* The placeholder's glyph and label, which occupy the middle of the frame — the same
     band the copy lands in once it fades up. */
  const mockRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  /* Last progress seen, so exiting fullscreen can repaint the geometry it cleared. */
  const progressRef = useRef(0);
  const fullscreenRef = useRef(false);
  const stretchedRef = useRef(false);

  const [inView, setInView] = useState(false);
  /* Written on the threshold crossing only, never on every scroll tick — the frame itself
     is painted through refs. */
  const [stretched, setStretched] = useState(false);
  const [isFull, setIsFull] = useState(false);
  /* null = follow the scroll; a boolean = the visitor pressed play or pause and their
     choice wins from then on. */
  const [override, setOverride] = useState<boolean | null>(null);
  const [muted, setMuted] = useState(true);
  /* null = the scroll decides how stretched the frame is; "card" = the visitor pressed
     réduire and it stays a card; "full" is only reached from fullscreen. */
  const [manual, setManual] = useState<Manual>(null);
  const [ready, setReady] = useState(false);

  const hasVideo = Boolean(service.presentationVideo);
  const shouldPlay = hasVideo && inView && (override ?? (stretched || reduceMotion));

  const paint = useCallback((p: number, reduced: boolean, manual: Manual) => {
    progressRef.current = p;
    const section = sectionRef.current;
    const stage = stageRef.current;
    const frame = frameRef.current;
    if (!section || !stage || !frame || fullscreenRef.current) return;

    // Progress at which the sticky stage locks to the top of the viewport.
    const pin = Math.min(0.9, window.innerHeight / section.offsetHeight);
    const scrolled = easeInOutSine(ramp(p, [pin * GROW_START, pin]));
    const grow = manual === "card" ? 0 : reduced || manual === "full" ? 1 : scrolled;
    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;

    // The card is derived from the stage every frame rather than cached: the stage is
    // `svh`-tall, so a collapsing mobile URL bar changes it mid-scroll.
    const cardWidth = Math.min(stageWidth * CARD_WIDTH, stageHeight * CARD_HEIGHT_MAX * CARD_ASPECT);
    const cardHeight = cardWidth / CARD_ASPECT;

    frame.style.width = `${cardWidth + (stageWidth - cardWidth) * grow}px`;
    frame.style.height = `${cardHeight + (stageHeight - cardHeight) * grow}px`;
    frame.style.borderRadius = `${CARD_RADIUS * (1 - grow)}px`;

    const copy = grow === 0 ? 0 : reduced || manual === "full" ? 1 : easeInOutSine(ramp(p, [pin * COPY_START, pin + COPY_TAIL]));
    if (copyRef.current) {
      copyRef.current.style.opacity = String(copy);
      copyRef.current.style.transform = `translate3d(0, ${((1 - copy) * 28).toFixed(2)}px, 0)`;
    }
    // The scrim rides the copy: over the small card there is no text to protect, and
    // darkening the footage early only makes the card look switched off.
    if (scrimRef.current) scrimRef.current.style.opacity = String(copy);
    // ...and the placeholder's glyph rides it inversely. With no video set, its label sits
    // dead centre and the copy lands over it — on a short stage the two collide outright.
    // The generated art behind it stays; only the foreground trades places with the copy.
    if (mockRef.current) mockRef.current.style.opacity = String(1 - copy);

    const isStretched = grow >= AUTOPLAY_AT;
    if (isStretched !== stretchedRef.current) {
      stretchedRef.current = isStretched;
      setStretched(isStretched);
    }
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    paint(reduceMotion ? 1 : 0, reduceMotion, manual);
    if (reduceMotion) return;

    // Sticky pins the stage; ScrollTrigger is only a progress source, so no pin-spacer is
    // injected and nothing fights the flex layout. `top bottom` rather than `top top`:
    // the growth belongs to the section's *approach*, so that it is done being a card by
    // the time it is in place. See `GROW_START`.
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top bottom",
      end: "bottom bottom",
      onUpdate: (self) => paint(self.progress, false, manual),
      onRefresh: (self) => paint(self.progress, false, manual),
    });
    return () => trigger.kill();
  }, [paint, reduceMotion, manual]);

  /* A screen of lead time, so the file is buffering before the card is on screen. */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver((entries) => setInView(entries[0]?.isIntersecting ?? false), {
      rootMargin: "100% 0px",
    });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Autoplay policies check the muted *property*, which React does not render as an
    // attribute during SSR — so the first play() would be rejected without this.
    video.muted = muted;
    if (shouldPlay) video.play().catch(() => {});
    else video.pause();
  }, [shouldPlay, muted]);

  const enterFull = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    fullscreenRef.current = true;
    setIsFull(true);
    // Hand sizing over to the UA / the overlay classes. Inline px would win against the
    // `:fullscreen` rules and leave the card its scroll-derived size on a black screen.
    frame.style.width = "";
    frame.style.height = "";
    frame.style.borderRadius = "";
    if (copyRef.current) copyRef.current.style.opacity = "1";
    if (scrimRef.current) scrimRef.current.style.opacity = "1";
    if (mockRef.current) mockRef.current.style.opacity = "0";
    frame.requestFullscreen?.().catch(() => {});
  }, []);

  const exitFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    fullscreenRef.current = false;
    setIsFull(false);
    paint(progressRef.current, reduceMotion, manual);
  }, [paint, reduceMotion, manual]);

  /* Leaving fullscreen by any route the page didn't drive — Escape, the browser's own
     control — has to bring the overlay down and restore the scroll-driven geometry. */
  useEffect(() => {
    const onChange = () => {
      if (document.fullscreenElement) return;
      if (!fullscreenRef.current) return;
      fullscreenRef.current = false;
      setIsFull(false);
      paint(progressRef.current, reduceMotion, manual);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [paint, reduceMotion, manual]);

  /* Only reached when `requestFullscreen` was refused and the `fixed` overlay is carrying
     the feature on its own: real fullscreen consumes Escape itself. The scroll lock is for
     the same case — the page is still scrollable under a fixed overlay, and this section's
     scroll position is what its geometry is derived from. */
  useEffect(() => {
    if (!isFull) return;
    const unlock = lockScroll();
    // Steps the site header aside — see the `[data-immersive]` rule in app/globals.css.
    document.documentElement.dataset.immersive = "true";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !document.fullscreenElement) exitFull();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      delete document.documentElement.dataset.immersive;
      window.removeEventListener("keydown", onKey);
    };
  }, [isFull, exitFull]);

  /* The one place where scroll is *not* the only input, and it has to be.
     `DeviceShowcase`'s rule — a click scrolls to the offset that produces the state it
     wants — cannot apply here: the growth is mapped to the section's arrival, so every
     scroll offset that shows a small card also has the stage half below the fold. There
     is no position that frames one. So "réduire" is a real override, and it wins over the
     scroll until the visitor toggles it back. */
  const toggleStretch = () => setManual((prev) => (prev === "card" ? null : "card"));

  const control =
    "flex h-9 w-9 items-center justify-center rounded-full bg-abyss/70 text-paper ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-abyss/90";

  return (
    <section
      ref={sectionRef}
      id="video"
      /* `shrink-0` because the section is a flex item in <main> and the tall explicit
         height *is* the pinning mechanism: 260svh puts `pin` (see `paint`) at roughly 0.38
         on a desktop, so the growth is over in the first screen and the remaining ~1.6
         screens are dwell time on a playing video. */
      className={cn(
        "relative shrink-0 bg-paper text-ink",
        reduceMotion ? "py-24" : "h-[260svh]",
      )}
    >
      <div
        ref={stageRef}
        className={cn(
          "relative flex w-full items-center justify-center overflow-hidden bg-paper",
          reduceMotion ? "h-[80svh]" : "sticky top-0 h-svh",
        )}
      >
        {/* Textured paper, the same two layers as `PerformanceMetrics` — an ink dot grid
            over soft mist washes, alpha in the colour rather than an `opacity-*` class so
            it can't be lightened twice.

            **Painted on the stage, not the section.** The stage is sticky and covers the
            viewport for the whole pinned range, so anything painted behind it is never
            seen; the section's own `bg-paper` only shows at the boundaries. Same trap as
            the `mix-blend-screen` ground in `DeviceShowcase`.

            Masked at the top: the section above is also white, so an abrupt start to the
            grid would be the only thing marking the boundary and would read as a stray
            line. While the section is still arriving the stage's top edge *is* that
            boundary, so the fade lands exactly on it; once pinned it is a barely-visible
            lightening at the top of the screen, and by then the frame covers it anyway. */}
        <div
          className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle_at_1px_1px,rgba(53,70,102,0.13)_1px,transparent_0)] [background-size:22px_22px]"
          style={{
            maskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 100%)",
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 12%, black 100%)",
          }}
        />
        <div className="pointer-events-none absolute -left-40 top-0 h-[30rem] w-[52rem] rounded-[50%] bg-mist/70 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-[26rem] w-[46rem] rounded-[50%] bg-mist/60 blur-3xl" />

        <div
          ref={frameRef}
          className={cn(
            // `on-dark` belongs on the frame now, not the section: the ground is paper, so
            // the accent variables have to be overridden by the *dark surface itself* —
            // the frame — or the eyebrow inside it resolves to `signal-deep` and lands at
            // ~2:1 on the footage. The ring gives the card an edge on white, which a
            // shadow alone does not at the top.
            "on-dark relative overflow-hidden bg-[#0b1018] text-paper ring-1 ring-ink/10",
            "shadow-[0_34px_90px_-32px_rgba(38,51,76,0.45)]",
            isFull && "fixed inset-0 z-[100] h-full w-full rounded-none",
          )}
        >
          {hasVideo ? (
            <video
              ref={videoRef}
              className="absolute inset-0 h-full w-full object-cover"
              src={service.presentationVideo}
              poster={service.presentationPoster}
              loop
              muted
              playsInline
              preload="metadata"
              onLoadedData={() => setReady(true)}
              tabIndex={-1}
            />
          ) : (
            <VideoMock service={service} foregroundRef={mockRef} />
          )}

          {/* Loading state. With a poster the frame is never empty, so it only needs a
              quiet marker; without one there is nothing to look at, so the skeleton
              covers the whole frame until the first frame decodes. */}
          {hasVideo && !ready && (
            service.presentationPoster ? (
              <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-abyss/80 px-3 py-1.5 text-[11px] font-medium text-paper/80 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal" />
                Chargement de la vidéo
              </span>
            ) : (
              <div className="skeleton-sweep absolute inset-0 overflow-hidden bg-ink" aria-hidden="true" />
            )
          )}

          {/* Scrim under the copy. Two stops rather than one flat wash: the bottom carries
              the text, the top only needs enough to keep the controls readable on bright
              footage. */}
          <div
            ref={scrimRef}
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-abyss/90 via-abyss/40 to-abyss/25"
            style={{ opacity: 0 }}
            aria-hidden="true"
          />

          <div
            ref={copyRef}
            // The bottom padding has to clear the control row, which is anchored to the
            // frame's bottom-right: on a phone the frame is tall and narrow, so a single
            // percentage puts the tagline's last line straight behind the buttons.
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end gap-4 px-6 pb-[22%] text-center md:pb-[14%]"
            style={{ opacity: 0 }}
          >
            <Badge className="border-signal/40 text-signal">Vidéo de présentation</Badge>
            <h2 className="font-display text-balance text-3xl font-semibold leading-[1.05] md:text-5xl">
              {service.name} en action.
            </h2>
            <p className="max-w-2xl text-balance text-sm leading-relaxed text-paper/85 md:text-base">
              {service.tagline}
            </p>
          </div>

          {/* Bottom-right rather than the reference's top-right: the site's navbar is
              fixed and glassy, and at full bleed a top-right control lands underneath it. */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            {hasVideo && (
              <>
                <button
                  type="button"
                  onClick={() => setOverride(!shouldPlay)}
                  aria-label={shouldPlay ? "Mettre la vidéo en pause" : "Lire la vidéo"}
                  title={shouldPlay ? "Mettre la vidéo en pause" : "Lire la vidéo"}
                  className={control}
                >
                  {shouldPlay ? (
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
                <button
                  type="button"
                  onClick={() => setMuted(!muted)}
                  aria-label={muted ? "Activer le son" : "Couper le son"}
                  title={muted ? "Activer le son" : "Couper le son"}
                  className={control}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d="M4 9h3l5-4v14l-5-4H4z" />
                    {muted ? (
                      <path
                        d="M16 9l5 6M21 9l-5 6"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        fill="none"
                      />
                    ) : (
                      <path
                        d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        fill="none"
                      />
                    )}
                  </svg>
                </button>
              </>
            )}

            {/* Nothing to scroll to under reduced motion — the section isn't pinned, so
                the frame has no scroll-derived size to jump between. */}
            {!reduceMotion && !isFull && (
              <button
                type="button"
                onClick={toggleStretch}
                aria-label={manual === "card" ? "Agrandir la vidéo" : "Réduire la vidéo"}
                title={manual === "card" ? "Agrandir la vidéo" : "Réduire la vidéo"}
                className={control}
              >
                <Icon name="move" className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => (isFull ? exitFull() : enterFull())}
              aria-label={isFull ? "Quitter le plein écran" : "Afficher en plein écran"}
              title={isFull ? "Quitter le plein écran" : "Afficher en plein écran"}
              className={control}
            >
              <Icon name={isFull ? "minimize" : "maximize"} className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * What the frame shows until `presentationVideo` is set — generated and on brand, so the
 * whole choreography can be reviewed before the footage exists. Same contract as
 * `MediaSlot`: a slot with no asset still looks designed, never broken.
 */
function VideoMock({
  service,
  foregroundRef,
}: {
  service: Service;
  /** The glyph and label, faded out by `paint` as the section's own copy arrives. */
  foregroundRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className="absolute inset-0">
      <div
        className={cn(
          "absolute -left-1/4 -top-1/3 h-[140%] w-2/3 rounded-full opacity-25 blur-3xl",
          paletteBg[service.palette.primary],
        )}
      />
      <div
        className={cn(
          "absolute -bottom-1/3 -right-1/4 h-[140%] w-2/3 rounded-full opacity-20 blur-3xl",
          paletteBg[service.palette.secondary],
        )}
      />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.45)_1px,transparent_0)] [background-size:28px_28px]" />

      <div
        ref={foregroundRef}
        className="absolute inset-0 flex flex-col items-center justify-center gap-5"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
          <svg viewBox="0 0 24 24" className="ml-1 h-6 w-6 text-paper" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-paper/70">
          Vidéo de présentation — à venir
        </p>
      </div>
    </div>
  );
}
