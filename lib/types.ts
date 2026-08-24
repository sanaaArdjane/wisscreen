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
   * An image that *already contains the device* — a finished mockup like
   * `public/service1.jpg`, exported from Figma or a mockup generator. It replaces the
   * drawn laptop for this solution instead of going inside it, so a mockup you already
   * have can be dropped in without re-exporting the screen on its own.
   *
   * Design it on a transparent or matching-dark background at roughly **16:10**; it is
   * rendered `object-contain` in the same slot as the drawn frame. Takes precedence
   * over `showcaseImage`.
   */
  showcaseMockup?: string;
  /**
   * Which layout the homepage highlights card uses.
   * - `"cards"` (default) — copy at the top, the three `stats` as data tiles below.
   * - `"image"` — `highlightImage` fills the whole card edge to edge, with the copy
   *   laid over it behind a scrim.
   */
  highlightVariant?: "cards" | "image";
}
