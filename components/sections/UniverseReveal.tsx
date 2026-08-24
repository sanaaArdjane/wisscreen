"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { Badge } from "@/components/ui/Badge";

/**
 * Full-bleed video that a scroll-scrubbed word clips into — the Apple
 * `/macbook-pro` "Take a closer look" beat, on a paper ground.
 *
 * How the clipping works: the video is a plain element filling the pinned stage,
 * and a paper-coloured `<rect>` covers it with an SVG `mask` whose only hole is the
 * word. So the video is visible *through the letters* and nowhere else — including
 * at the end, where the finished headline is still filled with moving footage.
 *
 * The beat, in order: full-bleed video; the ground resolving to paper with the camera
 * sitting inside the counter of the "a" in "Wissal"; a long zoom out until the whole
 * word is legible, centred; the word lifts to its resting place; the pitch lands under
 * it.
 */

const WORD = "Wissal Univers";

/* The three blocks that land last. First-draft copy like the rest of the site. */
const PITCH = [
  {
    title: "Un partenaire, pas un prestataire",
    body: "Nos équipes conçoivent, déploient et exploitent vos solutions de bout en bout — un seul interlocuteur, du cadrage à la production.",
  },
  {
    title: "Quatre solutions, une seule base",
    body: "OCR, WICLOUD, WIFACILITY et SETYCORE partagent la même infrastructure. Ce que vous activez aujourd'hui se connecte à ce que vous ajouterez demain.",
  },
  {
    title: "Vos données restent les vôtres",
    body: "Hébergement souverain sur WICLOUD, chiffrement de bout en bout et traçabilité complète. Vos documents ne quittent pas l'environnement que vous contrôlez.",
  },
];

/* Typography shared by the SVG word and the invisible <h2> that anchors it. The h2 is
   the layout source of truth — it keeps the finale in normal document flow (and gives
   the section a real heading for assistive tech), while `measure` reads its box to
   place the SVG copy on top of it. Any change here applies to both by construction.

   `clamp` rather than breakpoint steps: the SVG copy is measured off the h2, so a
   continuous ramp means one measurement holds across every width instead of the word
   jumping a size mid-scroll. `whitespace-nowrap` is load-bearing — the SVG <text> is a
   single line with no wrapping, so an h2 that wrapped would stop matching it. */
const WORD_TYPE = "font-display font-semibold leading-none whitespace-nowrap text-[clamp(2.25rem,12.5vw,15rem)]";

/* Scroll timeline, in progress units across the pinned section.

   `VEIL` is short and early on purpose, and the two numbers are load-bearing together.
   It was briefly a hard cut, which popped: the ground and a giant letter edge both
   arrived on a single frame. But a *long* fade is no better — it has to finish while the
   camera is still inside the counter, or the veil is still coming up when the zoom has
   already pulled back far enough to show whole letters, and the "you are inside the a"
   beat is spent behind a half-transparent wash. Ending at 0.13 keeps the scale above
   ~37×, which is still within the letter. */
const VEIL = [0.03, 0.13] as const; // full-bleed video -> paper ground
const ZOOM = [0.03, 0.56] as const; // inside the "a" -> whole word, centred
const LIFT = [0.6, 0.74] as const; // centred -> resting place near the top
const COPY = [0.72, 0.86] as const; // the last of the ghost clears to clean paper

/* The pitch blocks arrive one at a time rather than as a slab. `SPAN` is how long one
   block takes, `STEP` how far apart their starts are — STEP < SPAN so each begins while
   the one before is still settling, which reads as a sequence rather than three separate
   events. The last block finishes at START + 2·STEP + SPAN, so keep that under 1. */
const PITCH_START = 0.74;
const PITCH_SPAN = 0.095;
const PITCH_STEP = 0.065;

/* How much video still shows through the veil once it cuts in. The section holds the
   footage as a faint ground for most of the scroll, then clears to clean paper as the
   copy lands — the eyebrow's `ember` is calibrated to exactly clear 4.5:1 on *white*,
   so any residual tint under it would put it under. */
const GHOST = 0.08;

/* The video plays two roles, and they want opposite grading. Full-bleed at the start it
   is a picture and wants its full range; by the end it is the fill of a headline on white
   and wants contrast. So it darkens when it becomes type.

   This is not decorative. `object-cover` on a portrait viewport crops to the middle of the
   frame, which is where this footage is brightest — ungraded, the mobile finale rendered
   "ssal Univers" in near-white on white. At 0.5 even the brightest pixel in the footage
   composites to ~4.1:1 against paper, clear of the 3:1 that display type needs, while the
   darks (the bulk of it) are untouched. Kept mounted at k=0 rather than toggled on, so the
   compositing layer never appears mid-scroll. */
const VIDEO_DIM = 0.5;
const VIDEO_PUNCH = 0.15;

/* The opening frame sits inside the counter (the enclosed hole) of the "a" in "Wissal",
   so the cut to paper reads as a blank white screen that a giant letterform then grows
   into. Index 4 of "Wissal Univers"; measured off the <h2> with a Range, so the letter is
   located exactly rather than estimated.

   The two em fractions are *measured* off a screenshot, not estimated — there is no DOM
   API for a glyph's counter, and eyeballing them put a letter stroke in frame. `_EM` is the
   counter's height (Geist's double-storey "a" bowl is 0.138em, far smaller than it looks);
   `_DROP` is how far its centre sits below the line box's middle. `_FILL` is the margin: at
   1.0 the counter would exactly touch the stage's shorter axis, and the focus point is
   never quite the counter's centre, so it needs headroom. Re-measure all three if the
   display face or `ZOOM_CHAR` ever changes. */
const ZOOM_CHAR = 4;
const COUNTER_EM = 0.138;
const COUNTER_DROP = 0.205;
const COUNTER_FILL = 1.5;

/* Hard ceiling on how far the mask can be scaled, as `fontSize × scale` in CSS px.
   Blink stops rendering SVG text correctly somewhere past ~9,000px of effective em: the
   glyph geometry decouples from the transform and the mask draws the wrong part of the
   letter — boundaries move *back* toward the centre as the scale rises. Measured on this
   page: 60× at a 151px font (≈9,100px) is still right, 70× (≈10,600px) is not.

   Restructuring the transform to keep its translate small was necessary but not
   sufficient — the limit is in the glyph rasterizer, not the matrix. Converting the word
   to a `<path>` would lift it, at the cost of a font-parsing dependency and losing the
   "h2 is the source of truth" property.

   The practical effect: on desktop the opening frame is the counter with one wall of the
   bowl still in shot, rather than an unbroken white field. That reads better anyway — a
   featureless white screen tells the viewer nothing about where they are. */
const MAX_GLYPH_PX = 8500;

/* Reduced-motion read via useSyncExternalStore, matching HighlightsReel: the server
   snapshot keeps hydration consistent and there's no setState-in-effect. */
const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReduceMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCE_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getReduceMotion = () => window.matchMedia(REDUCE_MOTION_QUERY).matches;
const getReduceMotionOnServer = () => false;

const ramp = (p: number, [a, b]: readonly [number, number]) => Math.min(1, Math.max(0, (p - a) / (b - a)));
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

type Metrics = { zx: number; zy: number; startScale: number; lift: number };

export function UniverseReveal() {
  const reduceMotion = useSyncExternalStore(subscribeReduceMotion, getReduceMotion, getReduceMotionOnServer);

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wordRef = useRef<SVGGElement>(null);
  const wordTextRef = useRef<SVGTextElement>(null);
  const veilRef = useRef<SVGRectElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const eyebrowRef = useRef<HTMLSpanElement>(null);
  const pitchRefs = useRef<(HTMLDivElement | null)[]>([]);
  const metricsRef = useRef<Metrics | null>(null);

  // `useId` can contain characters that are invalid inside a `url(#…)` reference.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const wordId = `wu-word-${uid}`;
  const maskId = `wu-mask-${uid}`;

  const [inView, setInView] = useState(false);
  /* null = follow the reduced-motion preference; a boolean = the visitor pressed the
     button and their choice wins from then on. */
  const [override, setOverride] = useState<boolean | null>(null);
  /* The footage never stops being the headline's fill, so playback is gated on nothing
     but visibility — there is no point in the scroll where pausing it is free. */
  const shouldPlay = inView && (override ?? !reduceMotion);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    const heading = headingRef.current;
    if (!stage || !heading) return;

    const sb = stage.getBoundingClientRect();
    const hb = heading.getBoundingClientRect();
    const fontSize = parseFloat(getComputedStyle(heading).fontSize) || 48;
    const left = hb.left - sb.left;
    const midY = hb.top - sb.top + hb.height / 2;

    /* Locate the zoom letter exactly: a Range over one character of the <h2>'s text node
       gives its rendered box in the real font, at the real size, with the real tracking. */
    let focusX = left + hb.width * 0.34;
    const node = heading.firstChild;
    if (node && node.nodeType === Node.TEXT_NODE && (node.textContent?.length ?? 0) > ZOOM_CHAR) {
      const range = document.createRange();
      range.setStart(node, ZOOM_CHAR);
      range.setEnd(node, ZOOM_CHAR + 1);
      const cb = range.getBoundingClientRect();
      if (cb.width > 0) focusX = cb.left - sb.left + cb.width / 2;
    }

    metricsRef.current = {
      zx: focusX,
      zy: midY + COUNTER_DROP * fontSize,
      // Enough magnification to sit inside the counter, derived rather than hardcoded:
      // the same multiplier that works on a wide desktop leaves a tall phone looking at
      // whole letters instead of the hole in one. Then clamped to what Blink will draw.
      startScale: Math.max(
        4,
        Math.min((COUNTER_FILL * sb.height) / (COUNTER_EM * fontSize), MAX_GLYPH_PX / fontSize),
      ),
      // How far the word is held *below* its resting place while it is the only thing on
      // screen, so that "centred" and "settled" are the same layout seen twice.
      lift: sb.height / 2 - midY,
    };

    /* The word is drawn in coordinates *local to the zoom focus* — the focus is the local
       origin, so the word's own centre sits at a small offset from it.

       This is not a style choice, it is what makes the deep zoom render at all. The
       obvious form, `translate(zx zy) scale(s) translate(-zx -zy)`, has to compute
       `-zx * s`; at zx≈590 and s≈70 that is ~41,000, and the on-screen result is the
       difference of two numbers that size. SVG transform matrices are single precision
       (~7 significant digits), so the sub-pixel detail is gone: past ~60× the mask
       visibly rendered the wrong part of the glyph, with boundaries that moved *back*
       toward the centre as the scale rose. Keeping the translate small and the glyph
       coordinates local means the on-screen terms stay well inside float32's range. */
    const m = metricsRef.current;
    wordTextRef.current?.setAttribute("x", (left + hb.width / 2 - m.zx).toFixed(3));
    wordTextRef.current?.setAttribute("y", (midY - m.zy).toFixed(3));
  }, []);

  const paint = useCallback((p: number, reduced: boolean) => {
    const m = metricsRef.current;
    const word = wordRef.current;
    if (!m || !word) return;

    /* Reduced motion renders the finale directly — same composition, video still inside
       the letters, just not arrived at by scrolling. */
    // Eased, not linear: a linear opacity ramp has a visible corner at each end, which is
    // what makes a short fade still read as a switch.
    const veiled = reduced ? 1 : easeInOutSine(ramp(p, VEIL));
    const settle = reduced ? 1 : easeInOutSine(ramp(p, ZOOM));
    const lifted = reduced ? 1 : easeInOutSine(ramp(p, LIFT));
    const copy = reduced ? 1 : ramp(p, COPY);

    // Zoom interpolates in log space: a linear ramp across a 30x range crawls at the
    // start and then lunges, while a constant-rate zoom reads as one smooth move.
    const scale = Math.pow(m.startScale, 1 - settle);
    const drop = m.lift * (1 - lifted);
    // The word's coordinates are local to the zoom focus (see `measure`), so this places
    // that focus and scales around it — no large intermediate translate to lose bits to.
    word.setAttribute(
      "transform",
      `translate(${m.zx.toFixed(3)} ${(m.zy + drop).toFixed(3)}) scale(${scale.toFixed(4)})`,
    );

    // Rises to `1 - GHOST`, leaving the footage as a faint ground behind everything; the
    // last 8% closes later, as the copy arrives, so the finale sits on clean white.
    if (veilRef.current) veilRef.current.style.opacity = String(veiled * (1 - GHOST) + copy * GHOST);
    if (videoRef.current) {
      videoRef.current.style.filter =
        `brightness(${(1 - VIDEO_DIM * veiled).toFixed(3)}) contrast(${(1 + VIDEO_PUNCH * veiled).toFixed(3)})`;
    }
    // The eyebrow rides the lift, so the word rises to meet it; the pitch follows after.
    if (eyebrowRef.current) {
      eyebrowRef.current.style.opacity = String(lifted);
      eyebrowRef.current.style.transform = `translate3d(0, ${((1 - lifted) * 18).toFixed(2)}px, 0)`;
    }
    pitchRefs.current.forEach((el, i) => {
      if (!el) return;
      const start = PITCH_START + i * PITCH_STEP;
      const t = reduced ? 1 : easeInOutSine(ramp(p, [start, start + PITCH_SPAN]));
      el.style.opacity = String(t);
      el.style.transform = `translate3d(0, ${((1 - t) * 28).toFixed(2)}px, 0)`;
    });
  }, []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    measure();
    paint(reduceMotion ? 1 : 0, reduceMotion);
    if (reduceMotion) return;

    // CSS `position: sticky` does the pinning, so ScrollTrigger is only a progress
    // source — no pin-spacer injected into the DOM, nothing to fight with the layout.
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => paint(self.progress, false),
      onRefresh: (self) => {
        measure();
        paint(self.progress, false);
      },
    });

    // The word's start scale is derived from the heading's font size, so a late font
    // swap would leave it measured against the fallback face.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => trigger.kill();
  }, [measure, paint, reduceMotion]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries[0]?.isIntersecting ?? false),
      // A screen of lead time so the file is buffering before the stage is on screen.
      { rootMargin: "100% 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Autoplay policies require the muted *property*, which React doesn't render as an
    // attribute during SSR — set it here so the first play() isn't rejected.
    video.muted = true;
    if (shouldPlay) video.play().catch(() => {});
    else video.pause();
  }, [shouldPlay]);

  return (
    <section
      ref={sectionRef}
      id="univers"
      aria-label={WORD}
      // 5 screens of scroll: a beat of full-bleed video, a long zoom (30× on desktop,
      // ~100× on a phone) that needs the room, then the lift and the pitch. `svh` on the
      // stage so it and the track agree when a mobile URL bar collapses. `shrink-0`: the
      // section is a flex item in <main>, and the tall explicit height is the whole
      // mechanism — it must never be flex-shrunk away.
      className={reduceMotion ? "relative shrink-0 bg-paper text-ink" : "relative h-[500svh] shrink-0 bg-paper text-ink"}
    >
      <div ref={stageRef} className="sticky top-0 h-svh w-full overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          src="/lp_video.webm"
          loop
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          aria-hidden="true"
        />

        {/* The clipping layer. `pointer-events-none` so it never swallows the control. */}
        <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" aria-hidden="true">
          <defs>
            <g id={wordId} ref={wordRef}>
              <text ref={wordTextRef} className={WORD_TYPE} textAnchor="middle" dominantBaseline="central">
                {WORD}
              </text>
            </g>
            <mask id={maskId}>
              <rect width="100%" height="100%" fill="#fff" />
              <use href={`#${wordId}`} fill="#000" />
            </mask>
          </defs>

          <rect ref={veilRef} width="100%" height="100%" fill="#ffffff" mask={`url(#${maskId})`} style={{ opacity: 0 }} />
        </svg>

        {/* Copy sits above the veil, and this column *is* the finale — the scroll only
            holds the word below its place here until the lift. The <h2> stays invisible
            for good: it anchors the SVG word and carries the heading semantics, while the
            SVG paints it. `pt` rather than `justify-center` so the settled word sits high
            enough that the rise is a real move and the pitch has the lower half. */}
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center px-6 pt-[18svh] text-center">
          {/* Wrapper rather than a ref on Badge: Badge is a plain server component that
              doesn't take one, and the animation only needs a box to move. */}
          <span ref={eyebrowRef} style={{ opacity: 0 }}>
            <Badge className="text-warm border-warm/40">Un seul écosystème</Badge>
          </span>
          <h2 ref={headingRef} className={`${WORD_TYPE} mt-7 opacity-0`}>
            {WORD}
          </h2>
          <div className="mt-12 grid w-full max-w-5xl gap-8 text-left md:mt-20 md:grid-cols-3 md:gap-10">
            {PITCH.map((block, i) => (
              <div
                key={block.title}
                ref={(el) => {
                  pitchRefs.current[i] = el;
                }}
                style={{ opacity: 0 }}
              >
                <p className="font-semibold leading-snug">{block.title}</p>
                {/* `/80` rather than the site's usual `opacity-70`: ink at 70% on paper
                    lands at 4.12:1, under the 4.5:1 floor for this size. */}
                <p className="mt-2 text-sm leading-relaxed text-ink/80 md:text-base">{block.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stays put for the whole section — the video is still playing inside the
            finished headline, so there is always something to pause. */}
        <button
          type="button"
          onClick={() => setOverride(!shouldPlay)}
          aria-label={shouldPlay ? "Mettre la vidéo en pause" : "Lire la vidéo"}
          className="absolute right-6 top-24 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-ink/55 text-paper ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-ink/75 md:right-10"
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
      </div>
    </section>
  );
}
