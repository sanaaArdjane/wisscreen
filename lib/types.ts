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
   * Which layout the homepage highlights card uses.
   * - `"cards"` (default) — copy at the top, the three `stats` as data tiles below.
   * - `"image"` — `highlightImage` fills the whole card edge to edge, with the copy
   *   laid over it behind a scrim.
   */
  highlightVariant?: "cards" | "image";
}
