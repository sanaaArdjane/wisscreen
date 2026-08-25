import type { Service } from "@/lib/types";

/**
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *  EVERY LINK, PHOTO AND VIDEO THE SITE POINTS AT — ALL IN THIS ONE FILE
 * ═══════════════════════════════════════════════════════════════════════════════════════
 *
 * Nothing else in the app hardcodes a media path or an external URL. Filling the site with
 * real assets is editing this file and nothing else; `lib/data/services.ts` keeps the copy
 * and the structure, and `withMedia()` at the bottom stitches the two together.
 *
 * ── Two ways to supply anything ────────────────────────────────────────────────────────
 *
 *  1. **A file in `public/`** — drop it in `public/photos/` or `public/videos/` and write
 *     the path *without* "public": `"/photos/ocr-hero.jpg"`, `"/videos/ocr-demo.mp4"`.
 *  2. **A link** — paste the absolute URL: `"https://cdn.example.com/ocr-hero.jpg"`.
 *
 * Both work everywhere a path is accepted. Images go through `next/image` when local (so
 * they are resized per breakpoint and converted to a modern format) and are served as-is
 * when remote, which is what lets a URL be pasted here without registering its host in
 * next.config.ts. Videos are plain `<video>` either way.
 *
 * Every slot has a designed placeholder, so leaving a field out is a valid state: the
 * section renders generated on-brand art instead, never a broken image.
 *
 * ── WHERE EACH FIELD SHOWS UP, BY THE TITLE YOU SEE ON THE PAGE ────────────────────────
 *
 * HOMEPAGE
 *
 *   "L'essentiel, en un coup d'œil."   → `highlight`   2400 × 1200 (2:1)
 *        The big carousel cards. **Setting `highlight` is what turns that solution's card
 *        into a photo card**; without it the card shows its three stats as data tiles
 *        instead. There is no other image slot on those cards.
 *
 *   "Nos interfaces"                   → `site`, then `screenshot` / `screenshotMobile`,
 *                                        or `mockup`
 *        The laptop and phone. `site` is framed live; `screenshot` (2560 × 1600) and
 *        `screenshotMobile` (1170 × 2532) are what show while it loads and if it never
 *        does. `mockup` is for a photo that *already contains a laptop* — it replaces the
 *        drawn one rather than going on its screen.
 *
 *   "Toutes nos solutions"             → every solution's `cover`
 *   "La plateforme"                    → `cover` of WIFACILITY, SETYCORE, WICLOUD
 *   "Data & Intelligence"              → OCR's `cover`
 *        All three read the **same** field: `cover`, 1600 × 1000 (16:10). One file per
 *        solution covers its card in the grid, its Etaysir / SETYCORE / WICLOUD panel in
 *        "La plateforme" (OCR has no panel there — that section is the three admin
 *        back-offices), and the OCR panel in "Data & Intelligence".
 *
 *   "OCR en action"                    → OCR's `gallery[0]`
 *        Deliberately the same file as the first slot of OCR's own gallery, so the demo
 *        panel and the solution page cannot drift apart.
 *
 *   The 3D globe's hover card          → `preview`  (a short looping GIF)
 *
 *   The word that video is clipped into → `HOME_MEDIA.revealVideo`, further down.
 *
 * SOLUTION PAGES (/solutions/…)
 *
 *   The hero's browser window          → `site`, `screenshot` (same as "Nos interfaces")
 *   "Vidéo de présentation"            → `video` + `videoPoster`   16:9 / 1920 × 1080
 *        The clip that stretches open as you scroll into it.
 *   "Images, vidéos & démo"            → `gallery`   1600 × 1000 (16:10)
 *        One entry per slot, in the order the slots are declared in `services.ts`; the
 *        labels are repeated as comments below so you can tell which is which. A slot
 *        declared `video-slot` there takes a **video** file and gets native controls.
 *   "Solutions liées"                  → the other solutions' `cover`
 *
 * ── Cheat sheet ────────────────────────────────────────────────────────────────────────
 *
 *   cover             1600 × 1000   the solution's one general-purpose image (3 sections)
 *   highlight         2400 × 1200   its homepage carousel card, and switches it to a photo
 *   screenshot        2560 × 1600   desktop UI, inside the drawn laptop
 *   screenshotMobile  1170 × 2532   the same screen, inside the phone
 *   mockup             ~16:10       a photo that already contains a device
 *   preview                –        looping GIF in the globe's hover card
 *   video               16:9        the solution page's scroll-stretched video
 *   videoPoster       1920 × 1080   its first frame, shown while it buffers
 *   gallery[]         1600 × 1000   the "Images, vidéos & démo" grid
 *   site                 URL        the live project, framed
 */

/** A local path under `public/` (`"/photos/…"`) or an absolute URL. */
type Asset = string;

export interface SolutionMedia {
  /** The project's live URL, framed in the hero and in the homepage device screens. */
  site?: Asset;
  /** Separate URL for the phone frame. Defaults to `site`, which is usually right. */
  siteMobile?: Asset;
  /**
   * The solution's general-purpose image, 1600 × 1000. The most reused field here: it is
   * the card in "Toutes nos solutions", the admin panel in "La plateforme" (WIFACILITY,
   * SETYCORE and WICLOUD only), the OCR panel in "Data & Intelligence", and the cards
   * under "Solutions liées". One file, up to four places.
   */
  cover?: Asset;
  /**
   * The homepage carousel card, 2400 × 1200. Setting this also **switches that card to the
   * photo layout** — without it the card shows the solution's three stats as data tiles.
   */
  highlight?: Asset;
  screenshot?: Asset;
  screenshotMobile?: Asset;
  mockup?: Asset;
  preview?: Asset;
  video?: Asset;
  videoPoster?: Asset;
  /**
   * One entry per gallery slot of that solution, **in the order the slots are declared**
   * in `lib/data/services.ts`. `null` keeps a slot's generated mock.
   */
  gallery?: (Asset | null)[];
}

/* ─────────────────────────────────────────────────────────────────────────────────────────
   THE SOLUTIONS. Keyed by slug — the same four in lib/data/services.ts.
   ───────────────────────────────────────────────────────────────────────────────────────── */

export const SOLUTION_MEDIA: Record<string, SolutionMedia> = {
  ocr: {
    // site: "https://ocr.example.com",
    mockup: "/photos/service1.jpg",
    // cover: "/photos/ocr-cover.jpg",
    // highlight: "/photos/ocr-highlight.jpg",
    // screenshot: "/photos/ocr-desktop.jpg",
    // screenshotMobile: "/photos/ocr-mobile.jpg",
    // preview: "/videos/ocr-preview.gif",
    // video: "/videos/ocr-presentation.mp4",
    // videoPoster: "/photos/ocr-presentation-poster.jpg",
    gallery: [
      null, // Détection des champs sur une pièce d'identité — also "OCR en action" on the homepage
      null, // Précision par type de document
      null, // Démonstration vidéo du moteur OCR  (video-slot — takes a video file)
    ],
  },

  wicloud: {
    // site: "https://wicloud.example.com",
    // cover: "/photos/wicloud-cover.jpg",
    highlight: "/photos/highlight_test.jpg",
    gallery: [
      null, // Supervision temps réel des ressources
      null, // Gestion des instances et du stockage
      null, // Présentation vidéo de la console WICLOUD  (video-slot)
    ],
  },

  wifacility: {
    // site: "https://wifacility.example.com",
    // cover: "/photos/wifacility-cover.jpg",
    // highlight: "/photos/wifacility-highlight.jpg",
    gallery: [
      null, // Suivi des échéanciers en temps réel
      null, // Évaluation et scoring d'un dossier
      null, // Parcours client de simulation d'achat échelonné
    ],
  },

  setycore: {
    site: "https://wi-univers-release.admin.setycorp.net/",
    // cover: "/photos/setycore-cover.jpg",
    // highlight: "/photos/setycore-highlight.jpg",
    gallery: [
      null, // Statistiques de vente en temps réel
      null, // Parcours d'achat côté client
      null, // Démonstration de la marketplace SETYCORE  (video-slot)
    ],
  },
};

/* ─────────────────────────────────────────────────────────────────────────────────────────
   THE HOMEPAGE. Media that isn't tied to one solution.
   ───────────────────────────────────────────────────────────────────────────────────────── */

export const HOME_MEDIA = {
  /**
   * The full-bleed clip in `UniverseReveal` — the footage the headline "Wissal Univers" is
   * clipped out of, so it ends up being the *fill of display type on white*. That puts a
   * real constraint on any replacement: it has to stay dark enough to hold 3:1 against
   * paper inside the glyphs. The current clip has mean relative luminance 0.05 (~10.5:1).
   * Measure a candidate rather than eyeballing it — draw it to a canvas and histogram the
   * luminance — or expect to re-grade `VIDEO_DIM` in that component.
   */
  revealVideo: "/videos/lp_video.webm" as Asset,
};

/* ─────────────────────────────────────────────────────────────────────────────────────────
   Wiring. `services.ts` maps its raw entries through this; nothing else needs to know.
   ───────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Copies this solution's entry from `SOLUTION_MEDIA` onto its `Service`.
 *
 * Assignments are conditional so an absent key leaves the field `undefined` rather than
 * writing `undefined` over a value — which matters because every consumer treats
 * "undefined" as "render the placeholder".
 */
export function withMedia(service: Service): Service {
  const media = SOLUTION_MEDIA[service.slug];
  if (!media) return service;

  const gallery = service.media.gallery.map((slot, index) => {
    const src = media.gallery?.[index];
    return src ? { ...slot, src } : slot;
  });
  const hero = media.cover ? { ...service.media.hero, src: media.cover } : service.media.hero;

  return {
    ...service,
    ...(media.site ? { previewUrl: media.site } : {}),
    ...(media.siteMobile ? { previewMobileUrl: media.siteMobile } : {}),
    ...(media.screenshot ? { showcaseImage: media.screenshot } : {}),
    ...(media.screenshotMobile ? { showcaseMobileImage: media.screenshotMobile } : {}),
    ...(media.mockup ? { showcaseMockup: media.mockup } : {}),
    ...(media.preview ? { previewGif: media.preview } : {}),
    ...(media.video ? { presentationVideo: media.video } : {}),
    ...(media.videoPoster ? { presentationPoster: media.videoPoster } : {}),
    // Supplying a card photo *is* the request for the photo layout. Deriving it here rather
    // than making it a second thing to remember in services.ts: setting one and forgetting
    // the other gave either a photo the layout never showed, or a layout with no photo.
    ...(media.highlight ? { highlightImage: media.highlight, highlightVariant: "image" as const } : {}),
    media: { ...service.media, hero, gallery },
  };
}
