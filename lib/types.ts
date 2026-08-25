export type Audience = "banques" | "partenaires" | "particuliers" | "entreprises";

export type PaletteToken = "teal" | "aqua" | "steel";

export type IconName =
  | "scan"
  | "layers"
  | "globe"
  | "shield"
  | "zap"
  | "link"
  | "bar-chart"
  | "clock"
  | "credit-card"
  | "store"
  | "server"
  | "lock"
  | "check"
  | "users"
  | "cloud"
  | "sparkles"
  | "refresh"
  | "database"
  | "move"
  | "maximize"
  | "minimize"
  | "external"
  | "arrow-right";

export type MediaSlotKind =
  | "mock-dashboard"
  | "mock-scan"
  | "mock-chart"
  | "video-slot"
  | "image-slot";

export interface MediaSlot {
  kind: MediaSlotKind;
  label: string;
  /**
   * The real asset for this slot. Set it and the generated mock is replaced by the
   * file; leave it out and the mock stays — a slot never renders a broken `<img>`.
   *
   * Two forms are accepted, and which one you use decides how it is served:
   * - a **local path** (`"/gallery/ocr-fields.jpg"`, file dropped in `public/`) goes
   *   through `next/image`, so it is resized per breakpoint and converted to a modern
   *   format;
   * - an **absolute URL** (`"https://…/shot.png"`) is served as-is (`unoptimized`), so
   *   a link can be pasted here without adding a host to `images.remotePatterns` in
   *   next.config.ts. Nothing else changes — same skeleton, same cross-fade.
   *
   * A `video-slot` expects a video file (mp4/webm) and gets native controls; every
   * other kind expects an image, rendered `object-cover` in a 16:10 frame — so keep
   * the subject in the middle ~85% and treat the edges as bleed. 1600 × 1000 px is
   * plenty; the frame is never wider than ~420 px on a three-up row.
   */
  src?: string;
  /** Poster frame for a `video-slot` that has a `src`. Same two forms as `src`. */
  poster?: string;
}

export interface ServiceStat {
  value: string;
  label: string;
}

export interface ServiceFeature {
  title: string;
  description: string;
  icon: IconName;
}

export interface ServiceStep {
  title: string;
  description: string;
}

export interface ServiceFaq {
  question: string;
  answer: string;
}

export interface SubProject {
  name: string;
  tagline: string;
  description: string;
}

export interface Service {
  slug: string;
  name: string;
  shortName: string;
  icon: IconName;
  category: string;
  tagline: string;
  heroDescription: string;
  description: string[];
  audiences: Audience[];
  palette: { primary: PaletteToken; secondary: PaletteToken };
  stats: ServiceStat[];
  features: ServiceFeature[];
  steps: ServiceStep[];
  faq: ServiceFaq[];
  subProjects?: SubProject[];
  media: { hero: MediaSlot; gallery: MediaSlot[] };
  team: string;
  /* ─────────────────────────────────────────────────────────────────────────────────────
     Everything below is media, and **none of it is set in `lib/data/services.ts`**: the
     values live in `lib/data/media.ts` and are copied onto the service by `withMedia`. The
     docs here describe what each field feeds and what to design for; that file is where you
     paste the path or the URL. Every one of them is optional, and every consumer treats
     "absent" as "render the generated placeholder" — never a broken image.
     ───────────────────────────────────────────────────────────────────────────────────── */

  /**
   * Optional path to a short looping GIF/video preview of the project, shown in
   * the globe's hover card. Drop the file in `public/` and set this to e.g.
   * "/previews/ocr.gif" — until then the card renders a labelled placeholder.
   */
  previewGif?: string;
  /**
   * Optional photo/screenshot for the big highlights card on the homepage.
   *
   * Design it at **2400 × 1200 px (2:1)**, PNG or JPG (WebP also fine). It is
   * rendered with `object-cover`, so the frame's real aspect ratio varies a little
   * with the viewport — keep the important content in the middle ~80% and treat the
   * outer edges as bleed. Drop the file in `public/` and set e.g.
   * "/highlights/ocr.jpg". Served through next/image, so it is automatically
   * resized per breakpoint, converted to a modern format and cached.
   */
  highlightImage?: string;
  /**
   * Screenshots for the device showcase (`components/sections/DeviceShowcase.tsx`),
   * where a laptop and a phone frame sit side by side and the tabs swap what's on
   * their screens.
   *
   * These are **plain screenshots, not device mockups** — the frames are drawn by the
   * component, so an image that already contains a laptop would nest one inside
   * another. Export the app window on its own.
   *
   * - `showcaseImage` — desktop UI at **2560 × 1600 px (16:10)**. Drop in `public/`
   *   and set e.g. "/showcase/ocr.jpg".
   * - `showcaseMobileImage` — the same screen on a phone, **1170 × 2532 px (9:19.5)**.
   *
   * Both are rendered through next/image with `fill` + `object-cover`, so they're
   * resized per breakpoint and converted to a modern format. Until they're set the
   * frames show a generated on-brand mock rather than a broken image.
   */
  showcaseImage?: string;
  showcaseMobileImage?: string;
  /**
   * A **live URL** shown inside the device frames of `DeviceShowcase` — the real
   * project, rendered in an `<iframe>` at desktop width in the laptop and at phone
   * width in the phone, then scaled down to fit. Set one per solution, e.g.
   * "https://ocr.wissalgroup.com".
   *
   * The preview is best-effort by nature: a site that sends `X-Frame-Options: DENY`
   * or a frame-ancestors CSP cannot be embedded, and a slow or offline host never
   * paints. So it always renders **on top of a fallback**, and falls back on its own
   * when it fails — see `PREVIEW_TIMEOUT_MS` in the component. The chain is:
   *
   *   previewUrl (iframe)  →  showcaseImage / showcaseMobileImage  →  generated mock
   *
   * Set the images too: they are what the visitor sees while the frame is loading and
   * what stays on screen if it never does.
   *
   * Takes precedence over `showcaseMockup`, which replaces the drawn laptop entirely
   * and so has nowhere to put a live frame.
   */
  previewUrl?: string;
  /**
   * Optional separate URL for the phone frame — a dedicated mobile build or a
   * deep link. Defaults to `previewUrl`, which is usually right: the frame is
   * already sized to a phone viewport, so a responsive site adapts on its own.
   */
  previewMobileUrl?: string;
  /**
   * An image that *already contains the device* — a finished mockup like
   * `public/photos/service1.jpg`, exported from Figma or a mockup generator. It replaces the
   * drawn laptop for this solution instead of going inside it, so a mockup you already
   * have can be dropped in without re-exporting the screen on its own.
   *
   * Design it on a transparent or matching-dark background at roughly **16:10**; it is
   * rendered `object-contain` in the same slot as the drawn frame. Takes precedence
   * over `showcaseImage`.
   */
  showcaseMockup?: string;
  /**
   * The scroll-stretched presentation video
   * (`components/sections/solution/SolutionVideoReveal.tsx`): it opens as a centred
   * card, grows to full-bleed as the section is scrolled, and starts playing once it
   * fills the viewport.
   *
   * A local path (`"/videos/ocr.mp4"`, file in `public/`) or an absolute URL — a
   * `<video>` is not served through next/image, so both work identically. Design it
   * **16:9**; it is `object-cover` in a frame that goes from ~16:9 to the viewport's
   * own ratio, so the crop tightens as it stretches — keep the subject centred.
   * MP4 (H.264) is the safest single file; WebM next to it as a `<source>` is a
   * future refinement.
   *
   * Until it is set the section still runs the whole choreography, with a generated
   * on-brand panel in place of the footage — same contract as `MediaSlot`.
   */
  presentationVideo?: string;
  /**
   * Poster frame for `presentationVideo` — what shows before the file has buffered
   * (the card is on screen well before it plays, so this is worth setting). Export a
   * still from the video itself at 1920 × 1080.
   */
  presentationPoster?: string;
  /**
   * Which layout the homepage highlights card uses.
   * - `"cards"` (default) — copy at the top, the three `stats` as data tiles below.
   * - `"image"` — `highlightImage` fills the whole card edge to edge, with the copy
   *   laid over it behind a scrim.
   */
  highlightVariant?: "cards" | "image";
}
