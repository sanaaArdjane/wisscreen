"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ScrollTrigger } from "@/lib/gsap";
import { SERVICES } from "@/lib/data/services";
import type { PaletteToken, Service } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { HandUnderline } from "@/components/ui/HandUnderline";
import { Icon } from "@/components/ui/Icon";
import { LivePreview } from "@/components/ui/LivePreview";
import { paletteBg } from "@/lib/palette";
import { lockScroll } from "@/lib/scrollLock";
import { cn } from "@/lib/cn";

/**
 * The solutions running on a laptop and a phone at the same time — one pair of frames,
 * swappable screens, so the section says both "here is each product" and "it works at
 * any size" without needing a second layout for the second claim.
 *
 * **Scroll is the single source of truth for which solution is showing.** The section is
 * pinned and its progress picks the screen; the tabs hold no state of their own, they
 * scroll the page to the offset where their solution is active. That is what keeps the
 * two inputs from fighting — a click-driven index *plus* a scroll-driven one means every
 * scroll after a click silently overrides the click.
 *
 * **The screens are navigable, and they zoom.** Each device carries an activation shield —
 * a button over the frame, so the wheel reaches the page and keeps driving the section —
 * that hands the pointer to the iframe on click and takes it back on `mouseleave` or Escape.
 * A control on each device zooms it to fill the stage; that is a **transform**, not a layout
 * change, so nothing reflows, the embedded page is never resized, and the browser
 * re-rasterises the frame at the new scale instead of upscaling a bitmap. A zoom locks the
 * page scroll and hides the header, because scrolling is what changes the tab and would swap
 * the screen being looked at.
 *
 * **Nothing ever remounts.** Every preview is mounted as the section comes into range and
 * stays in the DOM; a tab is a cross-fade between layers that have all already loaded, so
 * switching back and forth never reloads a site. Layers above the active one are transparent
 * but still take clicks, hence `pointer-events-none` on every inactive layer.
 *
 * What goes on a screen, in falling order of precedence:
 * - `previewUrl` — the **live site**, in an `<iframe>` rendered at a real desktop/phone
 *   viewport and scaled down to fit the frame. Best-effort: it is layered *over* the
 *   fallback and only fades in once it has actually painted, so a host that refuses to be
 *   framed (`X-Frame-Options`, `frame-ancestors`) or never answers degrades to the image
 *   with nothing flashing on screen. See `components/ui/LivePreview.tsx`.
 * - `showcaseImage` / `showcaseMobileImage` — a **plain screenshot**, rendered inside the
 *   drawn frame. This is the one to prefer; it keeps every solution on the same device.
 * - `showcaseMockup` — an image that **already contains the device**, which replaces the
 *   drawn laptop rather than going inside it. Without this, a mockup you already have
 *   (like `public/photos/service1.jpg`) would render as a laptop nested inside a laptop. A
 *   solution with a `previewUrl` ignores it: the drawn frame is the only one with a
 *   screen to put a live page on.
 */

const COUNT = SERVICES.length;

/* Progress held on the first and last solution before and after the run, so the section
   settles at each end instead of already moving at the moment it pins. */
const LEAD = 0.1;
const TAIL = 0.12;
/* Cross-fade width in units of "one solution": 0.3 means a screen holds for 70% of its
   slot and dissolves into the next over the remaining 30%. */
const FADE = 0.3;

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribeReduceMotion = (onChange: () => void) => {
  const query = window.matchMedia(REDUCE_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getReduceMotion = () => window.matchMedia(REDUCE_MOTION_QUERY).matches;
const getReduceMotionOnServer = () => false;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Scroll progress -> position along the run, in units of "one solution". */
const toRun = (p: number) => clamp01((p - LEAD) / (1 - LEAD - TAIL)) * (COUNT - 1);

/**
 * Opacity for the layer at `index`, given the run position.
 *
 * Layers stack with later ones on top, and every layer *below* the current one stays
 * fully opaque — only the topmost visible layer's alpha does the dissolving. A symmetric
 * tent (fading each layer in *and* out) would leave two half-transparent screens with the
 * section's own background showing between them.
 */
const layerAlpha = (index: number, run: number) => (index === 0 ? 1 : clamp01((run - index + FADE) / FADE));

type Device = "laptop" | "phone";

/** Breathing room left around a zoomed device, inside the stage. */
const ZOOM_PAD = 20;

export function DeviceShowcase() {
  const reduceMotion = useSyncExternalStore(subscribeReduceMotion, getReduceMotion, getReduceMotionOnServer);

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const screenRefs = useRef<(HTMLDivElement | null)[]>([]);
  const phoneRefs = useRef<(HTMLDivElement | null)[]>([]);
  /* The two device shells, the things a zoom transforms. */
  const laptopRef = useRef<HTMLDivElement>(null);
  const phoneShellRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);

  /* The only React state here: which tab reads as current, and which solutions have
     been on screen at least once. Both are written on the transition, never on every
     scroll tick — the screens themselves are painted through refs. */
  const [active, setActive] = useState(0);
  /* Which solutions have had their live preview mounted. Previews are real page loads, so
     they mount once and are **never unmounted** — a tab is a cross-fade between layers that
     are all already in the DOM, so switching back and forth never reloads a site.

     They are all seeded at once as the section approaches (see the observer below) rather
     than one at a time on becoming active: mounting on activation meant the first visit to
     each tab was a blank frame waiting on a page load, which reads exactly like a refresh. */
  const [seen, setSeen] = useState<number[]>([0]);
  const markSeen = useCallback((i: number) => {
    setSeen((prev) => (prev.includes(i) ? prev : [...prev, i]));
  }, []);

  /* Which device the visitor has handed the pointer to, and which one is zoomed. Both are
     null almost always: the section is scroll-driven, and a live iframe under the cursor
     swallows the wheel that drives it. */
  const [interacting, setInteracting] = useState<Device | null>(null);
  const [zoomed, setZoomed] = useState<Device | null>(null);

  const paint = useCallback((p: number) => {
    const run = toRun(p);
    for (let i = 0; i < COUNT; i++) {
      const a = String(layerAlpha(i, run));
      const screen = screenRefs.current[i];
      const phone = phoneRefs.current[i];
      if (screen) screen.style.opacity = a;
      if (phone) phone.style.opacity = a;
    }
    const next = Math.min(COUNT - 1, Math.max(0, Math.round(run)));
    if (next !== activeRef.current) {
      activeRef.current = next;
      setActive(next);
      markSeen(next);
    }
  }, [markSeen]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || reduceMotion) return;

    paint(0);
    // Sticky does the pinning; ScrollTrigger is only a progress source, so no pin-spacer
    // is injected and nothing fights the layout.
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => paint(self.progress),
      onRefresh: (self) => paint(self.progress),
    });
    return () => trigger.kill();
  }, [paint, reduceMotion]);

  /* Reduced motion drops the pinning entirely, so there is no scroll position to read
     and the tabs have to drive the screens directly. */
  useEffect(() => {
    if (!reduceMotion) return;
    for (let i = 0; i < COUNT; i++) {
      const a = i === active ? "1" : "0";
      const screen = screenRefs.current[i];
      const phone = phoneRefs.current[i];
      if (screen) screen.style.opacity = a;
      if (phone) phone.style.opacity = a;
    }
  }, [reduceMotion, active]);

  /* Zooming is a **transform, not a layout change**: the device keeps its box, so nothing
     around it reflows, the iframe inside is never resized (a resize is a real reflow of
     someone else's page, every frame), and the browser re-rasterises the frame at the new
     scale so it comes out sharp rather than upscaled. Centre-to-centre translate, then the
     largest scale that still fits inside the stage.

     Written straight to the node instead of held in state: it has to be recomputed on
     resize, and a transition on the element does the animating in both directions. */
  const applyZoom = useCallback((device: Device | null) => {
    const stage = stageRef.current;
    const laptop = laptopRef.current;
    const phone = phoneShellRef.current;
    if (!stage || !laptop || !phone) return;

    for (const [name, el] of [["laptop", laptop], ["phone", phone]] as const) {
      if (name !== device) {
        el.style.transform = "";
        continue;
      }
      const box = el.getBoundingClientRect();
      const bounds = stage.getBoundingClientRect();
      // The box is already transformed if this is a re-apply on resize, so undo first and
      // re-measure — otherwise the scale compounds.
      if (el.style.transform) {
        el.style.transform = "";
        el.getBoundingClientRect();
      }
      const rest = el.getBoundingClientRect();
      const scale = Math.min(
        (bounds.width - ZOOM_PAD * 2) / rest.width,
        (bounds.height - ZOOM_PAD * 2) / rest.height,
      );
      const dx = bounds.left + bounds.width / 2 - (rest.left + rest.width / 2);
      const dy = bounds.top + bounds.height / 2 - (rest.top + rest.height / 2);
      // `translate` sits left of `scale` in the list, so it is applied *after* it and is
      // not itself scaled — the centre-to-centre offsets above are used as measured.
      el.style.transform = `translate3d(${dx.toFixed(1)}px, ${dy.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
      void box;
    }
  }, []);

  /* Every exit from a zoom — Escape, the backdrop, the Fermer button — has to hand the
     pointer back too, or the released device keeps its "Échap pour défiler" chip and eats
     the wheel after the modal is gone. */
  const closeZoom = useCallback(() => {
    setZoomed(null);
    setInteracting(null);
  }, []);

  useEffect(() => {
    applyZoom(zoomed);
    if (!zoomed) return;

    /* A zoomed device is a modal: the page must not scroll under it, because scrolling is
       what changes the tab and the section would swap the very screen being looked at.
       Hiding the header is the same trick the solution hero's fullscreen uses — the sticky
       stage is a stacking context, so no z-index inside it can get above a fixed navbar. */
    const unlock = lockScroll();
    document.documentElement.dataset.immersive = "true";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeZoom();
    };
    const onResize = () => applyZoom(zoomed);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      unlock();
      delete document.documentElement.dataset.immersive;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [zoomed, applyZoom, closeZoom]);

  /* Escape also hands the pointer back, when a frame has it and nothing is zoomed. */
  useEffect(() => {
    if (!interacting || zoomed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInteracting(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [interacting, zoomed]);

  /* Every preview is mounted as the section comes into range, so no tab is ever waiting on
     a page load. A screen of lead time, like the other sections' observers. */
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setSeen(SERVICES.map((_, i) => i));
        observer.disconnect();
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const toggleZoom = (device: Device) => {
    const next = zoomed === device ? null : device;
    setZoomed(next);
    // Zoomed *is* the reason to look closely, and the scroll is locked while it is up, so
    // the frame may as well be live; collapsing hands the pointer back.
    setInteracting(next);
  };

  /* A tab is a jump to the scroll offset where its solution is active, not state of its
     own — the inverse of `toRun`. */
  const selectTab = (index: number) => {
    setInteracting(null);
    const section = sectionRef.current;
    if (reduceMotion || !section) {
      setActive(index);
      markSeen(index);
      return;
    }
    const p = LEAD + (index / (COUNT - 1)) * (1 - LEAD - TAIL);
    const box = section.getBoundingClientRect();
    window.scrollTo({
      top: window.scrollY + box.top + p * (box.height - window.innerHeight),
      behavior: "smooth",
    });
  };

  const current = SERVICES[active];

  return (
    <section
      ref={sectionRef}
      id="interfaces"
      // Roughly one screen of scroll per solution, plus the lead-in and tail. `shrink-0`
      // because the section is a flex item in <main> and its height is the mechanism.
      // `on-dark` is required, not decorative: the ground is an arbitrary value rather
      // than a palette token, so none of the `.bg-ink` / `.bg-abyss` selectors that carry
      // the dark-ground accent overrides would match, and `.text-signal` / `.text-accent`
      // would resolve to their light-ground values on a near-black section.
      className={cn(
        "on-dark relative shrink-0 bg-[#0f1520] text-paper",
        !reduceMotion && "h-[360svh]",
      )}
    >
      <div
        ref={stageRef}
        // The ground is painted *here*, on the sticky stage, not only on the section.
        // `position: sticky` creates a stacking context, and a stacking context isolates
        // blending — so a `mix-blend-*` child can only see what is painted inside the
        // stage. With the colour on the section alone, the mockup's black matte had
        // nothing to blend into and stayed a black rectangle.
        className={cn(
          "relative flex w-full flex-col justify-center overflow-hidden bg-[#0f1520]",
          // `pt` clears the fixed navbar: the stage is centred in the viewport, so
          // without it the eyebrow sits underneath the glass bar.
          reduceMotion ? "py-24" : "sticky top-0 h-svh pb-8 pt-16",
        )}
      >
        {/* Two soft washes so the ground isn't a flat slab — the devices sit *in* the
            section rather than on it. Same technique as PerformanceMetrics' mist washes,
            inverted for a dark ground. */}
        <div className="pointer-events-none absolute -left-32 top-[12%] h-[28rem] w-[40rem] rounded-[50%] bg-teal/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-40 bottom-[6%] h-[24rem] w-[34rem] rounded-[50%] bg-steel/15 blur-3xl" />

        {/* Wider than the site's `Container` on purpose — the devices are the whole
            point of this section, and 1280 caps them well below what the viewport can
            show. Heading, grid and tabs all align to this same edge. */}
        <div className="relative mx-auto flex w-full max-w-[84rem] flex-col gap-4 px-6 md:px-10">
          <div className="text-center lg:text-left">
            <Badge className="text-signal border-signal/40">Nos interfaces</Badge>
            <h2 className="font-display mt-4 text-balance text-xl font-semibold leading-[1.05] md:text-3xl">
              La même solution, sur chaque écran.
            </h2>
          </div>

          {/* Devices left, copy right — the two-column split is also what buys the laptop
              its size back: stacked, the heading, copy and tabs all eat the same vertical
              budget the devices need.

              On a 1440x900 desktop it is the *width*, not the height cap below, that
              decides how big the laptop gets — so the column ratio is the real lever.
              2.5fr against a copy column floored at 19rem puts the devices at ~72% of the
              row instead of 65%, which is most of the size increase; the floor is what
              stops the features list going to two lines per item and growing the stage. */}
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,2.5fr)_minmax(19rem,1fr)] lg:gap-8">
            {/* Still height-capped: the devices are the only elastic part, so the width is
                bounded by the height left over. `min()` lets whichever of width or height
                is scarcer win — height on a short desktop, width on a wide one. `pb`
                reserves the phone's overhang so the absolute frame never reaches into the
                tabs.

                20.5rem is what everything else in the stage costs vertically: pt-16 +
                pb-8, the eyebrow and heading, the two gap-4s, the tab row and this pb-4.
                1.6 is the device stack's own width:height — lid padding, a 16:10 screen
                and the base. Both were 21.5rem/1.55 and conservative by ~1rem; the gap-5
                -> gap-4 and pb-6 -> pb-4 above are what pays for the difference. If you
                add a line anywhere in the stage, raise the 20.5rem or the tabs go past
                the fold on a 760px-tall window. */}
            <div className="relative mx-auto w-full max-w-[min(64rem,calc((100svh-20.5rem)*1.6))] pb-4">
              {/* An invisible frame sets the height; the real ones stack on top of it, so
                  a solution that supplies a finished mockup can replace the whole laptop
                  rather than only what's on its screen. */}
              <div
                ref={laptopRef}
                onMouseLeave={() => interacting === "laptop" && !zoomed && setInteracting(null)}
                className={cn(
                  // `transition-transform` is what animates the zoom in *both* directions —
                  // the transform is written to this node, and clearing it animates back.
                  "relative transition-transform duration-700 ease-out motion-reduce:transition-none",
                  zoomed === "laptop" && "z-40",
                )}
              >
                <div className="invisible" aria-hidden>
                  <Laptop>{null}</Laptop>
                </div>
                {SERVICES.map((service, i) => (
                  <div
                    key={service.slug}
                    ref={(el) => {
                      screenRefs.current[i] = el;
                    }}
                    // Every layer is in the DOM at once and the ones above the active
                    // solution are merely transparent — a transparent layer still takes
                    // clicks, so only the active one may.
                    className={cn("absolute inset-0", i !== active && "pointer-events-none")}
                    style={{ opacity: i === 0 ? 1 : 0 }}
                    aria-hidden={i !== active}
                  >
                    {/* A finished mockup replaces the drawn laptop — unless the solution
                        has a live preview, which needs a real screen to render into. */}
                    {service.showcaseMockup && !service.previewUrl ? (
                      <Image
                        src={service.showcaseMockup}
                        alt={`${service.name} sur ordinateur portable`}
                        fill
                        sizes="(min-width: 1024px) 64rem, 100vw"
                        // `screen` makes a black matte vanish: screen(0, ground) == ground,
                        // so a mockup exported on black composites onto the section (and
                        // the washes behind it) with no visible rectangle. It lifts the
                        // image's own darks to the ground colour, which is the same thing
                        // the eye expects from a device sitting on that ground.
                        className="object-contain mix-blend-screen"
                      />
                    ) : (
                      <Laptop>
                        <Screen
                          service={service}
                          mounted={seen.includes(i)}
                          interactive={interacting === "laptop" && i === active}
                        />
                      </Laptop>
                    )}
                  </div>
                ))}

                <DeviceControls
                  device="laptop"
                  live={Boolean(current.previewUrl)}
                  interacting={interacting === "laptop"}
                  zoomed={zoomed === "laptop"}
                  onInteract={() => setInteracting("laptop")}
                  onRelease={() => setInteracting(null)}
                  onZoom={() => toggleZoom("laptop")}
                />
              </div>

              <div
                ref={phoneShellRef}
                onMouseLeave={() => interacting === "phone" && !zoomed && setInteracting(null)}
                className={cn(
                  "absolute bottom-0 right-0 w-[20%] max-w-[9.5rem] transition-transform duration-700 ease-out motion-reduce:transition-none sm:right-2 lg:right-4",
                  zoomed === "phone" && "z-40",
                )}
              >
                <Phone>
                  {SERVICES.map((service, i) => (
                    <div
                      key={service.slug}
                      ref={(el) => {
                        phoneRefs.current[i] = el;
                      }}
                      className={cn("absolute inset-0", i !== active && "pointer-events-none")}
                      style={{ opacity: i === 0 ? 1 : 0 }}
                      aria-hidden={i !== active}
                    >
                      <Screen
                        service={service}
                        compact
                        mounted={seen.includes(i)}
                        interactive={interacting === "phone" && i === active}
                      />
                    </div>
                  ))}
                </Phone>

                <DeviceControls
                  device="phone"
                  live={Boolean(current.previewMobileUrl ?? current.previewUrl)}
                  interacting={interacting === "phone"}
                  zoomed={zoomed === "phone"}
                  onInteract={() => setInteracting("phone")}
                  onRelease={() => setInteracting(null)}
                  onZoom={() => toggleZoom("phone")}
                />
              </div>
            </div>

            {/* Keyed on the slug so React remounts it and the entrance replays on change. */}
            <div key={current.slug} className="hero-rise text-center lg:text-left">
              <p className="text-accent text-xs font-semibold uppercase tracking-[0.14em]">{current.category}</p>
              <h3 className="font-display mt-2 text-2xl font-semibold leading-tight md:text-3xl">
                {/* `relative inline-block` is what HandUnderline positions against, and it
                    also keeps the rule the width of the word rather than the column. */}
                <span className="relative inline-block">
                  {current.name}
                  <HandUnderline className="underline-draw" />
                </span>
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-paper/70 md:text-base">{current.tagline}</p>
              <ul className="mt-5 flex flex-col gap-2.5 text-left">
                {current.features.slice(0, 3).map((feature) => (
                  <li key={feature.title} className="flex items-center gap-3 text-sm">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/8">
                      <Icon name={feature.icon} className="h-3.5 w-3.5" />
                    </span>
                    {feature.title}
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 lg:justify-start">
                <Link
                  href={`/solutions/${current.slug}`}
                  className="text-accent inline-flex items-center gap-1.5 text-sm font-medium"
                >
                  Découvrir {current.name}
                  <Icon name="arrow-right" className="h-4 w-4" />
                </Link>
                {/* The frames are navigable now, but only inside their own viewport — this
                    is still the only way to actually leave for the site. Neutral rather
                    than accented: the signal hue marks one action per view, and that is
                    the CTA above. */}
                {current.previewUrl && (
                  <a
                    href={current.previewUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs font-medium text-paper/80 transition-colors hover:border-white/40 hover:text-paper"
                  >
                    Ouvrir le site
                    <Icon name="move" className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Tabs scroll horizontally rather than wrapping: a second row would change the
              stage's height mid-scroll, and the stage has no height to spare. */}
          <div className="-mx-6 w-[calc(100%+3rem)] overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max min-w-full items-center justify-center gap-6 border-b border-white/15 md:gap-10">
              {SERVICES.map((service, i) => (
                <button
                  key={service.slug}
                  type="button"
                  onClick={() => selectTab(i)}
                  aria-current={i === active}
                  className={cn(
                    "-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-medium tracking-tight transition-colors duration-300 md:text-base",
                    i === active ? "border-current text-paper" : "border-transparent text-paper/70 hover:text-paper",
                  )}
                >
                  {service.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Backdrop for a zoomed device. `z-30` puts it over the copy and the tabs (which
            are `z-auto`, so DOM order alone would leave them on top) and under the device,
            which takes `z-40`. Clicking it closes, like any modal. */}
        {zoomed && (
          <>
            <button
              type="button"
              aria-label="Fermer l'aperçu agrandi"
              onClick={closeZoom}
              className="absolute inset-0 z-30 cursor-default bg-abyss/85 backdrop-blur-sm"
            />
            {/* Outside the device, so it is not scaled up with it. */}
            <button
              type="button"
              onClick={closeZoom}
              className="absolute right-5 top-5 z-50 flex items-center gap-2 rounded-full bg-abyss/80 px-3 py-2 text-xs font-medium text-paper ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-abyss md:right-8"
            >
              <Icon name="minimize" className="h-3.5 w-3.5" />
              Fermer
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * The two controls that sit on a device: hand the pointer over, and zoom.
 *
 * The activation shield is the important one. This section is scroll-driven, and a live
 * iframe under the cursor swallows the wheel — so the frame stays inert behind a button,
 * where the wheel reaches the page as usual, until a click hands the pointer over. Leaving
 * the device or pressing Escape takes it back. Same contract as the solution hero's frame.
 *
 * Both are rendered inside the device shell, so they disappear under the zoom's transform
 * rather than needing their own geometry — except while zoomed, when the shield would be
 * scaled up and the stage-level "Fermer" button is the way out instead.
 */
function DeviceControls({
  device,
  live,
  interacting,
  zoomed,
  onInteract,
  onRelease,
  onZoom,
}: {
  device: Device;
  /** Whether this device is showing a real site — nothing to interact with otherwise. */
  live: boolean;
  interacting: boolean;
  zoomed: boolean;
  onInteract: () => void;
  onRelease: () => void;
  onZoom: () => void;
}) {
  const label = device === "laptop" ? "l'écran d'ordinateur" : "l'écran mobile";

  return (
    <>
      {live && !interacting && !zoomed && (
        <button
          type="button"
          onClick={onInteract}
          aria-label={`Naviguer dans ${label}`}
          className="group absolute inset-0 z-20 flex cursor-pointer items-center justify-center focus-visible:outline-none"
        >
          <span
            className={cn(
              "rounded-full bg-abyss/85 font-medium text-paper/80 ring-1 ring-white/15 backdrop-blur-sm transition-colors group-hover:bg-abyss group-hover:text-paper",
              device === "laptop" ? "px-3 py-1.5 text-[11px]" : "px-2 py-1 text-[9px]",
            )}
          >
            Cliquer pour naviguer
          </span>
        </button>
      )}

      {live && interacting && !zoomed && (
        <button
          type="button"
          onClick={onRelease}
          className="absolute bottom-1 left-1/2 z-30 -translate-x-1/2 rounded-full bg-abyss/85 px-2.5 py-1 text-[10px] font-medium text-paper/80 ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-abyss hover:text-paper"
        >
          Échap pour défiler
        </button>
      )}

      {!zoomed && (
        <button
          type="button"
          onClick={onZoom}
          aria-label={`Agrandir ${label}`}
          title={`Agrandir ${label}`}
          className={cn(
            "absolute z-30 flex h-7 w-7 items-center justify-center rounded-full bg-abyss/80 text-paper ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-abyss",
            device === "laptop" ? "right-2 top-2" : "-left-2 -top-2 h-6 w-6",
          )}
        >
          <Icon name="maximize" className={device === "laptop" ? "h-3.5 w-3.5" : "h-3 w-3"} />
        </button>
      )}
    </>
  );
}

/** MacBook-ish lid, notch and base. Drawn rather than an image so any screenshot fits. */
function Laptop({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div className="relative rounded-[1.1rem] border border-white/15 bg-[#20283a] p-[0.55rem] shadow-2xl md:rounded-[1.4rem] md:p-[0.7rem]">
        <div className="relative aspect-16/10 w-full overflow-hidden rounded-[0.6rem] bg-[#1b2436] md:rounded-[0.8rem]">
          {children}
          {/* Notch, above the screen content but inside the bezel's radius. */}
          <div className="absolute left-1/2 top-0 z-10 h-[1.2%] w-[14%] -translate-x-1/2 rounded-b-[0.35rem] bg-[#20283a]" />
          {/* One soft diagonal sheen, so the panel reads as glass rather than a poster. */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10" />
        </div>
      </div>
      {/* Base — wider than the lid, with the thumb notch cut into the middle. */}
      <div className="mx-auto h-2 w-[104%] -translate-x-[2%] rounded-b-[0.4rem] bg-gradient-to-b from-[#2b3346] to-[#161c29] md:h-2.5" />
      <div className="mx-auto h-1.5 w-[13%] rounded-b-[0.5rem] bg-[#11161f]" />
    </div>
  );
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[1.4rem] border border-white/15 bg-[#20283a] p-[0.3rem] shadow-2xl lg:rounded-[1.8rem] lg:p-[0.4rem]">
      <div className="relative aspect-9/19.5 w-full overflow-hidden rounded-[1.15rem] bg-[#1b2436] lg:rounded-[1.5rem]">
        {children}
        <div className="absolute left-1/2 top-[2%] z-10 h-[3%] w-[32%] -translate-x-1/2 rounded-full bg-black/70" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10" />
      </div>
    </div>
  );
}

/**
 * What's on a screen. The fallback is always rendered, and the live preview (when the
 * service has one) is layered on top of it — that ordering is the whole failure story:
 * a frame that is refused or never answers simply never fades in, and the visitor sees
 * the screenshot the entire time rather than a white rectangle that resolves later.
 *
 * The screenshot itself falls back to a generated on-brand stand-in, never a broken
 * `<img>` — same contract as `MediaSlot`, but drawn edge to edge because it fills a
 * device screen instead of sitting in a card.
 */
function Screen({
  service,
  compact = false,
  mounted = true,
  interactive = false,
}: {
  service: Service;
  compact?: boolean;
  /** Whether this solution has been on screen yet — gates the real page load. */
  mounted?: boolean;
  /** Whether the visitor has handed the pointer to this device. */
  interactive?: boolean;
}) {
  const src = compact ? service.showcaseMobileImage : service.showcaseImage;
  const previewUrl = compact ? (service.previewMobileUrl ?? service.previewUrl) : service.previewUrl;

  return (
    <>
      {src ? (
        <Image
          src={src}
          alt={`Interface ${service.name}`}
          fill
          sizes={compact ? "9.5rem" : "(min-width: 1024px) 64rem, 100vw"}
          className="object-cover"
        />
      ) : (
        <ScreenMock service={service} compact={compact} />
      )}

      {mounted && previewUrl && (
        <LivePreview
          key={previewUrl}
          url={previewUrl}
          compact={compact}
          interactive={interactive}
          // The laptop screen is ~865px wide, so it renders at 1024 logical and 0.85 rather
          // than a 1440 squeezed to 0.6 — the same sharpness argument as the solution hero,
          // and `PREVIEW_MIN_WIDTH` keeps it on a desktop breakpoint. The phone frame is far
          // below its floor, so for it this changes nothing.
          adaptive
          title={`Aperçu en direct de ${service.name}${compact ? " sur mobile" : ""}`}
        />
      )}
    </>
  );
}

function ScreenMock({ service, compact }: { service: Service; compact: boolean }) {
  const accent: PaletteToken = service.palette.primary;
  return (
    // Deliberately darker than the section: the placeholder has to separate from the
    // ground the way a real screenshot will, or the bezel edge disappears.
    <div className="absolute inset-0 flex flex-col bg-[#1b2436]">
      <div className={cn("absolute -right-1/4 -top-1/4 h-2/3 w-2/3 rounded-full opacity-25 blur-3xl", paletteBg[accent])} />
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:16px_16px]" />

      <div className="relative flex items-center gap-1.5 border-b border-white/10 px-[3%] py-[1.6%]">
        <span className="h-1 w-1 rounded-full bg-white/30 md:h-1.5 md:w-1.5" />
        <span className="h-1 w-1 rounded-full bg-white/30 md:h-1.5 md:w-1.5" />
        <span className="h-1 w-1 rounded-full bg-white/30 md:h-1.5 md:w-1.5" />
        <span className="ml-[4%] h-1.5 w-[28%] rounded-full bg-white/10" />
      </div>

      <div className="relative flex flex-1 gap-[3%] p-[3%]">
        {/* No sidebar on the phone — that is the point of showing both frames. */}
        {!compact && (
          <div className="flex w-[18%] flex-col gap-[5%]">
            <span className={cn("h-[7%] w-[70%] rounded-full opacity-80", paletteBg[accent])} />
            {[0, 1, 2, 3, 4].map((row) => (
              <span key={row} className="h-[5%] rounded-full bg-white/10" style={{ width: `${90 - row * 9}%` }} />
            ))}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-[4%]">
          <div className="flex items-center gap-[3%]">
            <span className={cn("flex items-center rounded-md p-1 opacity-90", paletteBg[accent])}>
              <Icon name={service.icon} className="h-3 w-3 text-abyss md:h-3.5 md:w-3.5" />
            </span>
            <span className="h-1.5 flex-1 rounded-full bg-white/12" />
          </div>
          <div className={cn("grid flex-1 gap-[3%]", compact ? "grid-cols-2" : "grid-cols-3")}>
            {[0, 1, 2, 3, 4, 5].slice(0, compact ? 4 : 6).map((cell) => (
              <div key={cell} className="rounded-md border border-white/10 bg-white/5 p-[7%]">
                <span className="block h-1 w-1/2 rounded-full bg-white/20" />
                <span className={cn("mt-[14%] block h-2 w-3/4 rounded-full opacity-70", paletteBg[accent])} />
              </div>
            ))}
          </div>
          <div className="h-[22%] rounded-md border border-white/10 bg-white/5" />
        </div>
      </div>
    </div>
  );
}
