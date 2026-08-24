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
import { paletteBg } from "@/lib/palette";
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
 * Photos drop in two ways, because both kinds of asset exist in the wild:
 * - `showcaseImage` / `showcaseMobileImage` — a **plain screenshot**, rendered inside the
 *   drawn frame. This is the one to prefer; it keeps every solution on the same device.
 * - `showcaseMockup` — an image that **already contains the device**, which replaces the
 *   drawn laptop rather than going inside it. Without this, a mockup you already have
 *   (like `public/service1.jpg`) would render as a laptop nested inside a laptop.
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

export function DeviceShowcase() {
  const reduceMotion = useSyncExternalStore(subscribeReduceMotion, getReduceMotion, getReduceMotionOnServer);

  const sectionRef = useRef<HTMLElement>(null);
  const screenRefs = useRef<(HTMLDivElement | null)[]>([]);
  const phoneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeRef = useRef(0);

  /* The only React state here: which tab reads as current. Written on the transition,
     never on every scroll tick — the screens themselves are painted through refs. */
  const [active, setActive] = useState(0);

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
    }
  }, []);

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

  /* A tab is a jump to the scroll offset where its solution is active, not state of its
     own — the inverse of `toRun`. */
  const selectTab = (index: number) => {
    const section = sectionRef.current;
    if (reduceMotion || !section) {
      setActive(index);
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
      // the dark-ground accent overrides would match, and `.text-warm` / `.text-accent`
      // would resolve to their light-ground values on a near-black section.
      className={cn(
        "on-dark relative shrink-0 bg-[#0f1520] text-paper",
        !reduceMotion && "h-[360svh]",
      )}
    >
      <div
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
        <div className="relative mx-auto flex w-full max-w-[84rem] flex-col gap-5 px-6 md:px-10">
          <div className="text-center lg:text-left">
            <Badge className="text-warm border-warm/40">Nos interfaces</Badge>
            <h2 className="font-display mt-4 text-balance text-xl font-semibold leading-[1.05] md:text-3xl">
              La même solution, sur chaque écran.
            </h2>
          </div>

          {/* Devices left, copy right — the two-column split is also what buys the laptop
              its size back: stacked, the heading, copy and tabs all eat the same vertical
              budget the devices need. */}
          <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] lg:gap-12">
            {/* Still height-capped: the devices are the only elastic part, so the width is
                bounded by the height left over. `min()` lets whichever of width or height
                is scarcer win — height on a short desktop, width on a phone. `pb` reserves
                the phone's overhang so the absolute frame never reaches into the tabs. */}
            <div className="relative mx-auto w-full max-w-[min(54rem,calc((100svh-21.5rem)*1.55))] pb-6">
              {/* An invisible frame sets the height; the real ones stack on top of it, so
                  a solution that supplies a finished mockup can replace the whole laptop
                  rather than only what's on its screen. */}
              <div className="relative">
                <div className="invisible" aria-hidden>
                  <Laptop>{null}</Laptop>
                </div>
                {SERVICES.map((service, i) => (
                  <div
                    key={service.slug}
                    ref={(el) => {
                      screenRefs.current[i] = el;
                    }}
                    className="absolute inset-0"
                    style={{ opacity: i === 0 ? 1 : 0 }}
                    aria-hidden={i !== active}
                  >
                    {service.showcaseMockup ? (
                      <Image
                        src={service.showcaseMockup}
                        alt={`${service.name} sur ordinateur portable`}
                        fill
                        sizes="(min-width: 1024px) 54rem, 100vw"
                        // `screen` makes a black matte vanish: screen(0, ground) == ground,
                        // so a mockup exported on black composites onto the section (and
                        // the washes behind it) with no visible rectangle. It lifts the
                        // image's own darks to the ground colour, which is the same thing
                        // the eye expects from a device sitting on that ground.
                        className="object-contain mix-blend-screen"
                      />
                    ) : (
                      <Laptop>
                        <Screen service={service} />
                      </Laptop>
                    )}
                  </div>
                ))}
              </div>

              <div className="absolute bottom-0 right-0 w-[22%] max-w-[10rem] sm:right-2 lg:right-4">
                <Phone>
                  {SERVICES.map((service, i) => (
                    <div
                      key={service.slug}
                      ref={(el) => {
                        phoneRefs.current[i] = el;
                      }}
                      className="absolute inset-0"
                      style={{ opacity: i === 0 ? 1 : 0 }}
                      aria-hidden={i !== active}
                    >
                      <Screen service={service} compact />
                    </div>
                  ))}
                </Phone>
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
              <Link
                href={`/solutions/${current.slug}`}
                className="text-accent mt-5 inline-flex items-center gap-1.5 text-sm font-medium"
              >
                Découvrir {current.name}
                <Icon name="arrow-right" className="h-4 w-4" />
              </Link>
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
      </div>
    </section>
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
 * What's on a screen: the real screenshot when the service has one, otherwise a generated
 * on-brand stand-in — never a broken `<img>`, same contract as `MediaSlot`, but drawn edge
 * to edge because it fills a device screen instead of sitting in a card.
 */
function Screen({ service, compact = false }: { service: Service; compact?: boolean }) {
  const src = compact ? service.showcaseMobileImage : service.showcaseImage;
  if (src) {
    return (
      <Image
        src={src}
        alt={`Interface ${service.name}`}
        fill
        sizes={compact ? "9rem" : "(min-width: 1024px) 58rem, 100vw"}
        className="object-cover"
      />
    );
  }
  return <ScreenMock service={service} compact={compact} />;
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
