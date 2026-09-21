import { z } from "zod";
import { ICON_NAMES } from "@/lib/types";

/**
 * The shape of everything the admin can edit on the public site, as Zod schemas.
 *
 * No database import on purpose: the admin editors (client components) validate
 * against these as the owner types, the server actions validate the same schemas
 * again on save, and `lib/content/index.ts` validates what it reads back — a block
 * that no longer matches (a field renamed in code since it was saved) falls back
 * to its default instead of breaking the page.
 */

/* ───────────────────────────── Primitives ───────────────────────────── */

const text = (max = 400) => z.string().max(max);
const longText = (max = 3000) => z.string().max(max);

/**
 * An image or video: a file under `public/` (`/photos/…`), an uploaded site asset
 * (`/media/<id>`), or an absolute URL. Empty = unset, which every consumer renders
 * as its generated placeholder. Protocol-relative (`//host`) and `javascript:` are
 * refused — this string ends up in `src` attributes.
 */
export const AssetSchema = z
  .string()
  .max(2000)
  .refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || /^https?:\/\//i.test(v), {
    message: "Chemin (/photos/…) ou lien https:// attendu.",
  });

/** A link target: in-page anchor, site path, absolute URL, mail or phone. */
export const HrefSchema = z
  .string()
  .max(500)
  .refine(
    (v) => v === "" || v.startsWith("#") || (v.startsWith("/") && !v.startsWith("//")) || /^(https?:\/\/|mailto:|tel:)/i.test(v),
    { message: "Lien attendu : #ancre, /chemin, https://, mailto: ou tel:." },
  );

export const IconSchema = z.enum(ICON_NAMES);
export const SlugSchema = z
  .string()
  .min(2)
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Minuscules, chiffres et tirets uniquement (ex. mon-service).");

const Heading = z.object({ eyebrow: text(), title: text(), description: longText(800) });
const Cta = z.object({ label: text(80), href: HrefSchema });
const IconItem = z.object({ icon: IconSchema, title: text(), text: longText(800) });
const TitleText = z.object({ title: text(), text: longText(800) });
const TitleContent = z.object({ title: text(), content: longText(2000) });
const section = <T extends z.ZodRawShape>(shape: T) => z.object({ hidden: z.boolean(), ...shape });

/* ───────────────────────────── General, hero, footer ───────────────────────────── */

export const GeneralSchema = z.object({
  siteName: text(60),
  seoTitle: text(120),
  seoDescription: longText(320),
  keywords: z.array(text(60)).max(40),
  contact: z.object({
    email: text(200),
    phone: text(60),
    whatsapp: text(60),
    address: text(300),
    hours: text(200),
  }),
  socials: z.object({
    linkedin: HrefSchema,
    facebook: HrefSchema,
    instagram: HrefSchema,
    x: HrefSchema,
    youtube: HrefSchema,
    tiktok: HrefSchema,
  }),
});

export const HERO_MODES = ["earth", "stack", "image", "video", "slides"] as const;
export type HeroMode = (typeof HERO_MODES)[number];

export const HeroSlideSchema = z.object({
  kind: z.enum(["image", "video"]),
  src: AssetSchema,
  poster: AssetSchema,
  caption: text(160),
});

export const HeroSchema = z.object({
  badge: text(80),
  headline: text(120),
  words: z.array(text(60)).min(1).max(10),
  paragraph: longText(600),
  primaryCta: Cta,
  secondaryCta: Cta,
  hint: text(200),
  visual: z.object({
    mode: z.enum(HERO_MODES),
    image: AssetSchema,
    imageAlt: text(200),
    video: AssetSchema,
    videoPoster: AssetSchema,
    slides: z.array(HeroSlideSchema).max(12),
    /** Seconds per slide. */
    interval: z.number().min(2).max(30),
  }),
});

export const FooterSchema = z.object({
  blurb: longText(600),
  columns: z
    .array(
      z.object({
        title: text(60),
        /** Prepends one link per published solution — the "Solutions" column. */
        includeSolutions: z.boolean(),
        links: z.array(z.object({ label: text(80), href: HrefSchema })).max(12),
      }),
    )
    .max(6),
  copyright: text(200),
  tagline: text(200),
});

/* ───────────────────────────── Homepage sections, in page order ───────────────────────────── */

export const SectionSchemas = {
  highlights: section({
    titleUnderlined: text(80),
    titleRest: text(120),
    link: Cta,
  }),
  performance: section({ heading: Heading }),
  reveal: section({
    badge: text(80),
    /** Exactly the blocks the scroll choreography times — see UniverseReveal. */
    pitch: z.array(z.object({ title: text(), body: longText(600) })).min(1).max(3),
    video: AssetSchema,
  }),
  devices: section({ badge: text(80), title: text() }),
  dataIntelligence: section({
    heading: Heading,
    points: z.array(IconItem).max(6),
    cta: Cta,
    /** Whose `cover` image fills the panel. */
    solutionSlug: z.string().max(60),
  }),
  reliability: section({
    badge: text(80),
    stat: text(20),
    paragraph: longText(600),
    points: z.array(z.object({ label: text(80), value: text(200) })).max(6),
  }),
  platform: section({
    heading: Heading,
    panels: z.array(z.object({ slug: z.string().max(60), title: text(), text: longText(600) })).max(6),
  }),
  connected: section({
    heading: Heading,
    links: z.array(z.object({ from: text(80), to: text(80), text: longText(600) })).max(8),
  }),
  audiences: section({
    heading: Heading,
    labels: z.object({ banques: text(40), entreprises: text(40), partenaires: text(40), particuliers: text(40) }),
    ctaLabel: text(60),
  }),
  scale: section({
    heading: Heading,
    specs: z.array(z.object({ icon: IconSchema, value: text(40), label: text(300) })).max(9),
  }),
  ocrDemo: section({
    heading: Heading,
    solutionSlug: z.string().max(60),
    fields: z.array(z.object({ label: text(80), value: text(80) })).max(10),
  }),
  integrations: section({ heading: Heading, items: z.array(IconItem).max(12) }),
  security: section({ heading: Heading, items: z.array(IconItem).max(6) }),
  finder: section({
    heading: Heading,
    profiles: z
      .array(
        z.object({
          title: text(),
          text: longText(600),
          solutions: z.array(z.object({ name: text(80), slug: z.string().max(60) })).max(6),
        }),
      )
      .max(8),
  }),
  migration: section({ heading: Heading, cta: Cta, steps: z.array(TitleText).max(8) }),
  whyUs: section({ heading: Heading, items: z.array(TitleContent).max(12) }),
  solutionsGrid: section({ heading: Heading, ctaPrefix: text(40) }),
  commitment: section({ heading: Heading, items: z.array(IconItem).max(6) }),
  values: section({ heading: Heading, items: z.array(IconItem).max(6) }),
  faq: section({ heading: Heading, items: z.array(TitleContent).max(20) }),
  contact: section({
    heading: Heading,
    supportLine: text(200),
    form: z.object({
      name: text(80),
      email: text(80),
      solution: text(80),
      solutionPlaceholder: text(80),
      other: text(80),
      message: text(80),
      submit: text(40),
      sending: text(40),
      success: text(300),
      error: text(300),
    }),
  }),
} as const;

export type SectionKey = keyof typeof SectionSchemas;
export const SECTION_KEYS = Object.keys(SectionSchemas) as SectionKey[];

export type GeneralContent = z.infer<typeof GeneralSchema>;
export type HeroContent = z.infer<typeof HeroSchema>;
export type HeroSlide = z.infer<typeof HeroSlideSchema>;
export type FooterContent = z.infer<typeof FooterSchema>;
export type SectionContent<K extends SectionKey> = z.infer<(typeof SectionSchemas)[K]>;
export type SectionsContent = { [K in SectionKey]: SectionContent<K> };

export type SiteContent = {
  general: GeneralContent;
  hero: HeroContent;
  footer: FooterContent;
  sections: SectionsContent;
};

/** Every row key `site_content` may hold. */
export type BlockKey = "general" | "hero" | "footer" | SectionKey;
export const BLOCK_SCHEMAS: Record<BlockKey, z.ZodType> = {
  general: GeneralSchema,
  hero: HeroSchema,
  footer: FooterSchema,
  ...SectionSchemas,
};

/* ───────────────────────────── Solutions ───────────────────────────── */

const Audience = z.enum(["banques", "partenaires", "particuliers", "entreprises"]);
const Palette = z.enum(["teal", "aqua", "steel"]);
const MediaSlotKind = z.enum(["mock-dashboard", "mock-scan", "mock-chart", "video-slot", "image-slot"]);

/** A solution's copy and structure — `lib/data/services.ts`, one entry. */
export const SolutionContentSchema = z.object({
  slug: SlugSchema,
  name: text(80),
  shortName: text(40),
  icon: IconSchema,
  category: text(120),
  tagline: text(300),
  heroDescription: longText(1200),
  description: z.array(longText(2000)).max(12),
  audiences: z.array(Audience).max(4),
  palette: z.object({ primary: Palette, secondary: Palette }),
  stats: z.array(z.object({ value: text(30), label: text(200) })).max(6),
  features: z.array(z.object({ title: text(), description: longText(600), icon: IconSchema })).max(12),
  steps: z.array(z.object({ title: text(), description: longText(600) })).max(10),
  faq: z.array(z.object({ question: text(300), answer: longText(2000) })).max(20),
  subProjects: z.array(z.object({ name: text(80), tagline: text(200), description: longText(1200) })).max(8),
  media: z.object({
    hero: z.object({ kind: MediaSlotKind, label: text(200) }),
    gallery: z.array(z.object({ kind: MediaSlotKind, label: text(200) })).max(12),
  }),
  team: text(200),
  highlightVariant: z.enum(["cards", "cards-gif", "image"]),
});

/** A solution's media — `lib/data/media.ts`, one entry. Empty string = unset. */
export const SolutionMediaSchema = z.object({
  site: AssetSchema,
  siteMobile: AssetSchema,
  cover: AssetSchema,
  highlight: AssetSchema,
  screenshot: AssetSchema,
  screenshotMobile: AssetSchema,
  mockup: AssetSchema,
  preview: AssetSchema,
  video: AssetSchema,
  videoPoster: AssetSchema,
  gallery: z.array(AssetSchema).max(12),
  statGifs: z.array(AssetSchema).max(6),
});

export type SolutionContent = z.infer<typeof SolutionContentSchema>;
export type SolutionMediaContent = z.infer<typeof SolutionMediaSchema>;
