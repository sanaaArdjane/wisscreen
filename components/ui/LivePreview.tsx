"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * The live site, in an `<iframe>`, scaled to fit whatever box it is given.
 *
 * Used by the homepage device frames (`DeviceShowcase`) and by the browser frame in the
 * solution hero (`SolutionHeroStage`). Both layer it **over a fallback** — a screenshot,
 * or a generated mock — and that ordering is the whole failure story: a host that refuses
 * to be framed or never answers simply never fades in, and the visitor sees the fallback
 * the entire time rather than a white rectangle that resolves later.
 *
 * Two things about it are load-bearing:
 *
 * **It renders at a real viewport and is scaled down**, rather than being squeezed into a
 * ~300px-wide iframe — otherwise a responsive site serves its phone layout to a laptop
 * frame. The scale *covers* the box (`max` of the two ratios, then centred), so a frame
 * whose ratio doesn't match the logical viewport crops evenly instead of letterboxing.
 * When the ratios do match — the drawn 16:10 laptop screen — cover and contain are the
 * same number, so the device frames are unaffected.
 *
 * **Whether the frame is allowed is decided before it is mounted, on the server.** It has
 * to be. Nothing the browser exposes to the parent document can tell "loaded cross-origin"
 * apart from "refused by X-Frame-Options" — measured in Chrome, both fire `load`, both
 * return `null` from `contentDocument`, and both throw `SecurityError` from
 * `contentWindow.location`. (An earlier cut of this read `contentDocument` and got it
 * exactly backwards: it treated every real cross-origin load as a failure.) A refused
 * frame then paints an **opaque** Chrome error page, so letting the fallback show through
 * a transparent frame is not an option either.
 *
 * So `/api/preview-status` reads the headers server-side — the only place they are
 * readable — and the frame is mounted only on a `true`. `PREVIEW_TIMEOUT_MS` is the
 * second guard, for a host that *is* embeddable but never paints; until `load` fires the
 * frame is transparent, so the fallback underneath is never uncovered.
 */

/* Logical viewport a preview is rendered at before being scaled down. The ratios match
   the drawn device screens exactly (16:10 and 9:19.5), and 1440 is a width every
   responsive site has a real breakpoint for. */
export const PREVIEW_VIEWPORT = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 845 },
};

/**
 * Narrowest logical viewport an `adaptive` preview will render at — the floor that keeps a
 * wide frame on the site's desktop layout instead of dropping it to a tablet breakpoint.
 * Above it the frame renders at its own size, i.e. **scale 1, no resampling at all**.
 */
export const PREVIEW_MIN_WIDTH = { desktop: 1024, mobile: 390 };

/**
 * How long a frame gets before the UI stops waiting on it. It is **not** a teardown: the
 * frame stays mounted and can still promote itself to live later; this only decides when the
 * hints that depend on a live frame give up.
 */
export const PREVIEW_TIMEOUT_MS = 9000;

export type PreviewStatus = "loading" | "live" | "failed";


export function LivePreview({
  url,
  compact = false,
  title,
  interactive = false,
  adaptive = false,
  onStatus,
}: {
  url: string;
  /** Use the phone viewport rather than the desktop one. */
  compact?: boolean;
  title: string;
  /**
   * Whether the visitor can click and scroll inside the frame. Off by default, and that
   * default matters: a scrollable iframe under the cursor swallows the wheel events that
   * a pinned section is driven by. Turn it on only where the page isn't scroll-driven —
   * the hero preview does, once it is expanded to fill the screen.
   */
  interactive?: boolean;
  /**
   * Render at the frame's **own** size rather than at a fixed logical viewport.
   *
   * This is a sharpness decision. The fixed-viewport mode renders 1440x900 and scales it
   * down to fit — in the solution hero's ~850px window that is 0.59, so every glyph is
   * drawn at 59% and resampled, which is what "the preview looks low quality" actually is.
   * Adaptive instead gives the iframe the box's own dimensions, floored at
   * `PREVIEW_MIN_WIDTH` so a wide frame still gets the desktop layout: at or above the
   * floor the scale is exactly 1 and the page is pixel-for-pixel native, and below it the
   * scale is the gentlest possible.
   *
   * It also fills the box exactly, so nothing is cropped — the fixed mode has to cover.
   * Use it wherever the frame is large enough to be read; leave it off for the little drawn
   * device screens, which have to show a *desktop* page at 300px and therefore must scale.
   */
  adaptive?: boolean;
  onStatus?: (status: PreviewStatus) => void;
}) {
  const { width, height } = compact ? PREVIEW_VIEWPORT.mobile : PREVIEW_VIEWPORT.desktop;
  const holderRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<PreviewStatus>("loading");
  /* null while the server is still deciding. The frame is not in the DOM until this is
     true, so a host that refuses to be framed never gets to paint its error page. */
  const [allowed, setAllowed] = useState<boolean | null>(null);

  /* The fit is written straight onto the frame rather than held in state — there is no
     other reader for it, and a layout effect lands it before paint.

     **Measured synchronously first, then kept in sync by the observer.** Waiting for the
     ResizeObserver's initial delivery is not safe: its callbacks ride the frame lifecycle,
     so in a throttled or background tab the first one can simply never arrive, and a frame
     that gated its own mounting on that measurement would sit at zero size until its
     deadline expired and then give up. The observer is for *changes*; the first value
     comes from the box itself. */
  useLayoutEffect(() => {
    // `allowed` is a real dependency, not decoration: the holder and the frame are not in
    // the DOM until the server has cleared this host, so on the first commits both refs
    // are null. Without re-running when that flips, the effect measures nothing and the
    // frame stays at 1:1 — a 1440px page cropped to the top-left corner of the screen.
    const el = allowed === true ? holderRef.current : null;
    if (!el) return;

    const apply = (boxWidth: number, boxHeight: number) => {
      const frame = frameRef.current;
      if (!frame || boxWidth === 0 || boxHeight === 0) return;

      if (adaptive) {
        // The page is laid out at the frame's own size (floored, so a wide frame keeps the
        // desktop breakpoint) and scaled by whatever is left over — 1 in the common case.
        // Height follows from the same scale, so the box is filled exactly and there is no
        // crop and no letterbox. Rounded to whole pixels: a fractional logical width makes
        // the embedded layout land on half-pixels and look soft for no reason.
        const floor = compact ? PREVIEW_MIN_WIDTH.mobile : PREVIEW_MIN_WIDTH.desktop;
        const logicalWidth = Math.round(Math.max(floor, boxWidth));
        const fit = boxWidth / logicalWidth;
        frame.style.width = `${logicalWidth}px`;
        frame.style.height = `${Math.round(boxHeight / fit)}px`;
        frame.style.transform = fit === 1 ? "none" : `scale(${fit})`;
        frame.style.left = "0px";
        frame.style.top = "0px";
        return;
      }

      // Cover, then centre horizontally. Computed here rather than with a percentage
      // translate: percentages in `transform` resolve against the element's *unscaled*
      // box, which makes centring a scaled 1440x900 iframe by transform alone wrong by
      // hundreds of pixels. With the box measured, the offsets are exact.
      //
      // Vertically it anchors to the **top**, not the centre. What is being previewed is a
      // web page, and the part of one that identifies it is its header and hero; a centred
      // crop in a letterbox-shaped box — the solution hero's window at rest — would show
      // the middle of the page instead, the least recognisable slice of it. Where the box
      // and the viewport share a ratio (both drawn device screens do) the two are the same
      // number anyway, so the device frames are unaffected.
      const scale = Math.max(boxWidth / width, boxHeight / height);
      frame.style.transform = `scale(${scale})`;
      frame.style.left = `${(boxWidth - width * scale) / 2}px`;
      frame.style.top = "0px";
    };

    apply(el.clientWidth, el.clientHeight);
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) apply(box.width, box.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [width, height, allowed, adaptive, compact]);

  useEffect(() => {
    const abort = new AbortController();
    fetch(`/api/preview-status?url=${encodeURIComponent(url)}`, { signal: abort.signal })
      .then((response) => response.json())
      .then((data: { embeddable?: boolean }) => setAllowed(Boolean(data.embeddable)))
      // An aborted fetch lands here too, but then the component is going away anyway.
      .catch(() => setAllowed(false));
    return () => abort.abort();
  }, [url]);

  /* Armed only once the frame is really in the DOM, so the probe's own latency doesn't
     eat the budget the page gets to paint in. No reset of `status`: the component is
     keyed on the url by its callers, so a different url is a different instance. */
  useEffect(() => {
    if (!allowed) return;
    const id = setTimeout(() => {
      setStatus((prev) => (prev === "loading" ? "failed" : prev));
    }, PREVIEW_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [allowed]);

  /* A refused host is a failure the moment the server says so — derived rather than
     stored, so there is one source of truth for it and no setState-in-effect. */
  const resolved: PreviewStatus = allowed === false ? "failed" : status;

  useEffect(() => {
    onStatus?.(resolved);
  }, [resolved, onStatus]);

  /* Only a *refused* host is unmounted. Passing the deadline is not: the server already
     cleared this one as embeddable, so a slow page is still coming — it stays mounted at
     opacity 0 behind the fallback and fades in whenever it finally paints. Unmounting on
     the deadline threw the load away and, in a stack of layers that come and go with the
     tabs, meant reloading the site from scratch on the next visit. */
  if (allowed !== true) return null;

  return (
    <div
      ref={holderRef}
      className={cn(
        "absolute inset-0 overflow-hidden transition-opacity duration-700 ease-out",
        resolved === "live" ? "opacity-100" : "opacity-0",
      )}
    >
      <iframe
        ref={frameRef}
        src={url}
        title={title}
        // Deliberately NOT `loading="lazy"`. Mounting is already gated — the callers only
        // render this once the frame is wanted — and lazy loading defers the fetch until
        // the frame nears the viewport while PREVIEW_TIMEOUT_MS counts from mount. A
        // preview that mounted a moment too early then hit its deadline having never
        // started loading, and gave up for good.
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        // Safe to trust here, unlike in the parent document: the frame only exists
        // because the server already said this host permits being framed.
        onLoad={() => setStatus("live")}
        className={cn("absolute border-0 bg-white", !interactive && "pointer-events-none")}
        // left/top/transform are written by the layout effect above.
        // width/height/left/top/transform are all written by the layout effect above; these
        // are only the pre-measurement values, and in `adaptive` mode the effect replaces
        // them outright.
        style={{ width, height, left: 0, top: 0, transformOrigin: "top left" }}
      />
    </div>
  );
}
