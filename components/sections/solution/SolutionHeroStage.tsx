"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import type { Service } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { LivePreview } from "@/components/ui/LivePreview";
import type { PreviewStatus } from "@/components/ui/LivePreview";
import { LoadingImage } from "@/components/ui/LoadingImage";
import { PaletteAura } from "@/components/sections/solution/PaletteAura";
import { paletteBg } from "@/lib/palette";
import { lockScroll } from "@/lib/scrollLock";
import { cn } from "@/lib/cn";

/**
 * The solution hero: copy on the left, and the live project inside a browser frame that
 * takes the right ~70% of the width — which the visitor can then stretch.
 *
 * The 30/70 split is what makes the frame a *window* rather than a letterbox: under a
 * full-width block of copy it only ever got the height the copy left over, which on a
 * short desktop was a 3:1 sliver of a page. Beside it, the frame gets the section's whole
 * height.
 *
 * Three states, in one dimension — how much room the frame gets:
 *
 * - `inset` — the frame sits beside the copy at ~70% of the width, rounded and bezelled.
 *   The default.
 * - `hero` — the copy collapses and the frame takes the **whole hero section**, edge to
 *   edge, still in the page (scrolling on carries you into the next section).
 * - `full` — the frame fills the **screen**, via the Fullscreen API. This is the only
 *   state where the iframe accepts clicks: see below.
 *
 * **The transition is a layout change made of animatable properties, not a measured
 * FLIP.** The copy column collapses along whichever axis the breakpoint stacks on — its
 * one-row grid goes `1fr` -> `0fr` on a phone (tweenable where `height: auto` is not), its
 * width goes 30% -> 0 on a desktop — and the frame's wrapper is `flex-1`, so it absorbs
 * the freed space on the same curve with nothing to keep in sync. Padding and border radius
 * ride along. No rects are measured, so nothing drifts when the copy reflows.
 *
 * **`full` is a `fixed` overlay *and* a `requestFullscreen()` call**, deliberately both.
 * The API is what the visitor actually wants (no browser chrome, Escape to leave), but it
 * is refused often enough — iOS Safari has no element fullscreen, and a permissions
 * policy can block it — that the overlay has to stand on its own. When the API works the
 * overlay is invisible underneath it; when it doesn't, the overlay *is* the feature, and
 * the Escape handler below is what closes it. Either way, leaving fullscreen returns the
 * frame to the size it was entered from (`beforeFullRef`), not to the stretched state.
 *
 * **The frame is navigable in every state, but the pointer has to be handed to it.** A
 * scrollable iframe under the cursor swallows the wheel, so an always-live frame means the
 * page stops scrolling wherever the pointer happens to rest. So outside fullscreen the
 * frame sits under a shield: the wheel lands on a button and the page scrolls normally, a
 * click hands the pointer over, and leaving the frame or pressing Escape takes it back —
 * the same contract as an embedded map. Fullscreen has no page to scroll, so it is
 * interactive outright.
 *
 * **The preview renders at the frame's own size, not at a downscaled 1440.** See `adaptive`
 * in `LivePreview`: in this window that is the difference between a page drawn at 59% and
 * resampled, and one drawn pixel-for-pixel. Below `lg` it switches to the site's *mobile*
 * build, because a desktop page in a 340px-wide frame is unreadable however sharp it is.
 *
 * What ends up on the screen, in falling order of precedence (each layered *over* the
 * next, so a failure uncovers the one below instead of leaving a hole):
 *
 *   previewUrl (iframe)  ->  showcaseImage  ->  generated mock
 */

type Mode = "inset" | "hero" | "full";

/* Below `lg` the frame is a few hundred px wide, so a desktop page rendered into it is
   unreadable however sharply it is drawn — the preview shows the site's *mobile* build
   there instead. Read through useSyncExternalStore rather than an effect so the server
   snapshot keeps hydration consistent. */
const MOBILE_QUERY = "(max-width: 1023px)";
const subscribeMobile = (onChange: () => void) => {
  const query = window.matchMedia(MOBILE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const getMobile = () => window.matchMedia(MOBILE_QUERY).matches;
const getMobileOnServer = () => false;

/** The host, for the chrome's address pill. Never throws on a malformed value. */
function hostOf(url: string | undefined) {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//i, "").split("/")[0] || null;
  }
}

export function SolutionHeroStage({
  service,
  children,
}: {
  service: Service;
  /** The hero copy. Rendered by the server component so it stays static markup. */
  children: ReactNode;
}) {
  const isMobile = useSyncExternalStore(subscribeMobile, getMobile, getMobileOnServer);
  const [mode, setMode] = useState<Mode>("inset");
  const [status, setStatus] = useState<PreviewStatus>("loading");
  /* Whether the visitor has handed the pointer to the frame. Off by default because a
     scrollable iframe under the cursor swallows the wheel and the page stops scrolling
     where the pointer happens to rest; a click is the opt-in, and leaving the frame or
     pressing Escape gives the page back. Same pattern as an embedded map. */
  const [interacting, setInteracting] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  /* The size fullscreen was entered from, so leaving it puts the frame back the way the
     visitor left it rather than dropping them into the stretched state. */
  const beforeFullRef = useRef<Exclude<Mode, "full">>("inset");

  const expanded = mode !== "inset";
  const host = hostOf(service.previewUrl);

  const enterFull = useCallback(() => {
    setMode((prev) => {
      if (prev !== "full") beforeFullRef.current = prev;
      // The overlay first, so the frame is already full-screen-shaped if the API refuses.
      return "full";
    });
    frameRef.current?.requestFullscreen?.().catch(() => {});
  }, []);

  const exitFull = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setMode(beforeFullRef.current);
    // Back in the page, the wheel belongs to the page again until it is handed over anew.
    setInteracting(false);
  }, []);

  /* Escape hands the pointer back to the page. Only bound while the frame has it, so it
     never competes with the fullscreen overlay's own handler below. */
  useEffect(() => {
    if (!interacting || mode === "full") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInteracting(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [interacting, mode]);

  /* Leaving fullscreen by any route the page didn't drive — Escape, the browser's own
     control, a tab switch — has to bring the overlay down with it. Entering is not
     handled here: the click already set the mode, and reacting to it as well would fight
     the state it just set. */
  useEffect(() => {
    const onChange = () => {
      if (document.fullscreenElement) return;
      setMode((prev) => (prev === "full" ? beforeFullRef.current : prev));
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  /* Only reached when `requestFullscreen` was refused and the overlay is on its own: the
     real fullscreen mode consumes Escape itself and fires `fullscreenchange` instead. The
     scroll lock is for the same case — a `fixed` overlay leaves the page scrollable
     underneath it, so the visitor would come back to a different scroll position. It
     compensates for the scrollbar it hides; see `lockScroll`. */
  useEffect(() => {
    if (mode !== "full") return;
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
  }, [mode, exitFull]);

  return (
    <section
      className={cn(
        "section-ink relative flex flex-col overflow-hidden",
        // Expanded, the section is exactly one screen — it *is* the frame. At rest it is
        // at least a screen and grows if the copy needs more than that.
        expanded ? "h-svh" : "min-h-svh",
      )}
    >
      <PaletteAura primary={service.palette.primary} secondary={service.palette.secondary} />

      {/* Copy left at 35vw, frame right with the rest — which is what lets the frame be a
          real browser window rather than the letterbox it was when it sat under a
          full-width block of copy. Stacked below `lg`, where 35% of the width is not a
          column. `items-stretch` so the frame gets the row's full height. */}
      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch">
        {/* Two collapse axes, and each is scoped to the breakpoint that stacks on it:
            below `lg` the one-row grid goes `1fr` -> `0fr` (tweenable where `height: auto`
            is not), at `lg` and up the *width* goes `35vw` -> 0 and the frame's `flex-1`
            absorbs it. Letting both run at `lg` squeezed the column diagonally — clipped
            from the right and from the bottom at once — which is most of what read as a
            glitch, so the row stays at `1fr` there.

            **The text's own box never changes width.** The inner div is pinned at `35vw`
            and the wrapper is what animates, so the copy is wiped by `overflow-hidden`
            rather than re-flowed. Animating the width of the box the text lives in means
            re-wrapping every line on every frame — words hopping between lines for the
            whole 700ms, which is the other half of the glitch. Both are `35vw`, the same
            unit, so they agree exactly at rest and nothing is clipped there; `%` against
            `vw` would differ by the scrollbar and shave the last glyph. This is also why
            there is no `min-w-*` floor: it would have to animate too, and at `lg` 35vw is
            already 22.4rem.

            `inert` rather than only `aria-hidden`: collapsed CTAs stay in the tab order
            otherwise.

            No `z-*` on this or the frame's wrapper — a positioned element with a z-index
            creates a stacking context, which would trap the fullscreen overlay's z-index
            below the navbar's. Paint order comes from DOM order instead, and PaletteAura is
            first, so both of these already sit above it. */}
        <div
          inert={expanded}
          className={cn(
            "relative grid w-full shrink-0 self-center transition-[grid-template-rows,width,opacity] duration-700 ease-out motion-reduce:transition-none",
            expanded
              ? "grid-rows-[0fr] opacity-0 lg:grid-rows-[1fr] lg:w-0"
              : "grid-rows-[1fr] opacity-100 lg:w-[35vw]",
          )}
        >
          <div className="overflow-hidden">
            <div className="px-6 pb-8 pt-32 md:px-10 md:pt-36 lg:w-[35vw] lg:pb-10 lg:pr-0">
              {children}
            </div>
          </div>
        </div>

        {/* The frame's slot. It takes what the copy gives up, so the growth needs no
            animation of its own. */}
        <div
          className={cn(
            "relative flex min-h-0 flex-1 transition-[padding] duration-700 ease-out motion-reduce:transition-none",
            // Stretched, the frame is edge to edge but still *under* the navbar: the fixed
            // header is translucent, and the window's own title bar landing behind it reads
            // as a bug. 5rem clears it in both its states (py-6 unscrolled, py-3 after).
            mode === "hero" && "p-0 pt-20",
            mode === "full" && "p-0",
            // Taller on a phone than the 46svh it used to be: the preview is now the site's
            // mobile build, and a portrait page in a landscape box would show a sliver of
            // it. Stacked under the copy it is below the fold anyway.
            mode === "inset" && "min-h-[64svh] px-6 pb-14 md:px-10 lg:min-h-0 lg:pb-20 lg:pt-32",
          )}
        >
          <div
            ref={frameRef}
            className={cn(
              "relative flex w-full flex-col overflow-hidden bg-[#0b1018] transition-[border-radius] duration-700 ease-out motion-reduce:transition-none",
              // The border stays on all four sides in every state, with the side ones going
              // transparent when the frame is edge to edge: dropping to `border-y` changes
              // the box by 1px on each side and the whole frame jumps at the end of the
              // transition.
              "border border-white/12",
              mode === "inset" && "rounded-2xl shadow-[0_30px_90px_-30px_rgba(0,0,0,0.85)] md:rounded-[1.75rem]",
              mode === "hero" && "rounded-none border-x-transparent",
              mode === "full" && "fixed inset-0 z-[100] max-w-none rounded-none border-transparent",
            )}
          >
            <FrameChrome
              host={host}
              loading={Boolean(service.previewUrl) && status === "loading"}
              mode={mode}
              url={service.previewUrl}
              onToggleStretch={() => {
                setMode(mode === "inset" ? "hero" : "inset");
                setInteracting(false);
              }}
              onToggleFull={() => (mode === "full" ? exitFull() : enterFull())}
            />

            <div
              className="relative min-h-0 flex-1 overflow-hidden bg-[#0d1420]"
              onMouseLeave={() => interacting && setInteracting(false)}
            >
              <FrameMock service={service} />

              {service.showcaseImage && (
                <LoadingImage
                  src={service.showcaseImage}
                  alt={`Interface ${service.name}`}
                  sizes="(min-width: 1024px) 60rem, 100vw"
                  priority
                />
              )}

              {service.previewUrl && (
                <LivePreview
                  key={service.previewUrl}
                  url={service.previewUrl}
                  // The frame is big enough to be read here, so it renders at its own size
                  // instead of being a downscaled 1440 — see `adaptive` in LivePreview.
                  adaptive
                  compact={isMobile}
                  title={`Aperçu en direct de ${service.name}`}
                  interactive={mode === "full" || interacting}
                  onStatus={setStatus}
                />
              )}

              {/* The activation shield. It sits *over* the frame and does nothing but take
                  the click that hands the pointer over — while it is there the wheel lands
                  on a button and the page scrolls as usual. Only once the frame is live: over
                  a placeholder it would promise something that isn't there. */}
              {status === "live" && mode !== "full" && !interacting && (
                <button
                  type="button"
                  onClick={() => setInteracting(true)}
                  className="group absolute inset-0 flex cursor-pointer items-end justify-center pb-3 focus-visible:outline-none"
                >
                  <span className="rounded-full bg-abyss/85 px-3 py-1.5 text-[11px] font-medium text-paper/80 ring-1 ring-white/15 backdrop-blur-sm transition-colors group-hover:bg-abyss group-hover:text-paper group-focus-visible:bg-abyss">
                    Cliquez pour naviguer dans le site
                  </span>
                </button>
              )}

              {/* Handing it back. `mouseleave` on the wrapper covers the pointer case, and
                  the chip is the touch case, where there is no leaving. */}
              {status === "live" && mode !== "full" && interacting && (
                <button
                  type="button"
                  onClick={() => setInteracting(false)}
                  className="absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-abyss/85 px-3 py-1.5 text-[11px] font-medium text-paper/80 ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-abyss hover:text-paper"
                >
                  Navigation active · Échap pour reprendre le défilement
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The window's title bar: lights, address, and every control the frame has. */
function FrameChrome({
  host,
  loading,
  mode,
  url,
  onToggleStretch,
  onToggleFull,
}: {
  host: string | null;
  loading: boolean;
  mode: Mode;
  url?: string;
  onToggleStretch: () => void;
  onToggleFull: () => void;
}) {
  const button =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-paper/70 transition-colors hover:bg-white/10 hover:text-paper focus-visible:bg-white/10 focus-visible:text-paper";

  return (
    <div className="relative z-10 flex shrink-0 items-center gap-2 border-b border-white/10 bg-white/[0.04] px-3 py-2 md:px-4">
      <span className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
        <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/25" />
      </span>

      <div className="flex min-w-0 flex-1 justify-center">
        <span className="flex min-w-0 items-center gap-2 rounded-full bg-black/30 px-3 py-1 text-[11px] text-paper/70">
          <Icon name="lock" className="h-3 w-3 shrink-0" strokeWidth={2} />
          <span className="truncate">{host ?? "aperçu du projet"}</span>
          {/* A pulse rather than a spinner: it is 11px tall and next to text. */}
          {loading && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-signal" />}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {/* Hidden in fullscreen: "how much of the section" is meaningless with no section
            on screen, and the only useful move there is to come back out. */}
        {mode !== "full" && (
          <button
            type="button"
            onClick={onToggleStretch}
            aria-label={mode === "hero" ? "Réduire l'aperçu" : "Étendre l'aperçu à toute la section"}
            title={mode === "hero" ? "Réduire l'aperçu" : "Étendre l'aperçu à toute la section"}
            className={button}
          >
            <Icon name="move" className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggleFull}
          aria-label={mode === "full" ? "Quitter le plein écran" : "Afficher en plein écran"}
          title={mode === "full" ? "Quitter le plein écran" : "Afficher en plein écran"}
          className={button}
        >
          <Icon name={mode === "full" ? "minimize" : "maximize"} className="h-4 w-4" />
        </button>
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Ouvrir le site dans un nouvel onglet"
            title="Ouvrir le site dans un nouvel onglet"
            className={button}
          >
            <Icon name="external" className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

/**
 * What the frame shows before anything real has been supplied — generated, on brand, and
 * always present underneath the layers that may or may not paint. Same contract as
 * `MediaSlot`: a slot that has no asset yet still looks designed.
 */
function FrameMock({ service }: { service: Service }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div
        className={cn(
          "absolute -right-1/4 -top-1/3 h-[130%] w-2/3 rounded-full opacity-25 blur-3xl",
          paletteBg[service.palette.primary],
        )}
      />
      <div
        className={cn(
          "absolute -bottom-1/3 -left-1/4 h-[130%] w-2/3 rounded-full opacity-20 blur-3xl",
          paletteBg[service.palette.secondary],
        )}
      />
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.45)_1px,transparent_0)] [background-size:26px_26px]" />

      <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
        <Icon name={service.icon} className="h-6 w-6" strokeWidth={1.4} />
      </span>
      <p className="relative text-xs font-semibold uppercase tracking-[0.14em] text-paper/70">
        Aperçu de {service.name} — à venir
      </p>
    </div>
  );
}
