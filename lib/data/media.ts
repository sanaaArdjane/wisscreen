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
 *   "L'essentiel, en un coup d'oeil." (stat tiles) → `statGifs`   looping GIF, one per tile
 *        Only used by a solution whose `highlightVariant` is "cards-gif" (OCR). Hovering a
 *        stat tile expands its GIF to fill the whole card; without an entry the tile still
 *        opens on hover but shows a "Démo à venir" placeholder.
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
 *   statGifs[]             –        looping GIF per stat tile, "cards-gif" variant only
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
  /**
   * One looping GIF per stat tile on the homepage highlight card, matched **by position**
   * to `Service.stats` (only the first three are ever shown). Only meaningful for a
   * solution whose `highlightVariant` is `"cards-gif"` — see `HighlightsReel.tsx`. `null`
   * (or a missing index) leaves that tile's hover-open state showing a placeholder.
   */
  statGifs?: (Asset | null)[];
}

/* ─────────────────────────────────────────────────────────────────────────────────────────
   THE SOLUTIONS. Keyed by slug — the same four in lib/data/services.ts.
   ───────────────────────────────────────────────────────────────────────────────────────── */

/**
 * Every solution below lists **every field `SolutionMedia` has, always in the same
 * order** — set or not. An unset one stays commented out with its expected size/format
 * and where it shows up, so this file alone answers "what can I fill in for this
 * solution, and what does each one do" without cross-checking the interface above.
 * Uncomment a line and paste a path or URL to fill it in; nothing else needs touching.
 */
export const SOLUTION_MEDIA: Record<string, SolutionMedia> = {
  ocr: {
    // site: "https://ocr.example.com",              // live URL — framed in the hero + homepage device screens (desktop)
    // siteMobile: "https://ocr.example.com/m",       // live URL for the phone frame only; defaults to `site` — rarely needed
    cover: "/photos/ocrGif_1.gif", // 1600×1000 — grid card, "Data & Intelligence" panel, "Solutions liées" card
    // highlight: "/photos/ocrGif_1.gif", // 2400×1200 — homepage carousel card; NOT used while highlightVariant is "cards-gif" (see statGifs below)
    screenshot: "/photos/ocrGif_1.gif", // 2560×1600 — plain screenshot shown inside the drawn laptop
    screenshotMobile: "/photos/ocrGif_1.gif", // 1170×2532 — same screen, inside the drawn phone
    // mockup: "/photos/ocrGif_2.gif", // finished mockup that already contains a device — replaces the drawn laptop entirely
    preview: "/photos/ocrGif_1.gif", // looping GIF — the 3D globe's hover card
    video: "/videos/ocr_video.webm", // 16:9 — the scroll-stretched "Vidéo de présentation"
    videoPoster: "/photos/ocr2.jpg", // 1920×1080 — first frame, shown while the video buffers
    gallery: [
      "/photos/ocrGif_2.gif", // "Extraction de données" panel
      "/photos/ocrGif_1.gif", // "OCR en action" panel
      "/videos/ocr_video.webm", // "Types de documents reconnus" panel
    ],
    // Temporary: a real public-domain looping GIF (Wikimedia Commons — Muybridge's
    // galloping horse), pasted in as an absolute URL, just to test the hover-expand
    // mechanism end to end with actual animation instead of a static test photo. Swap
    // each for its own real GIF later — a local /photos/… path works exactly the same.
    // Only read while highlightVariant is "cards-gif" (see lib/data/services.ts).
    statGifs: [
      "/photos/ocrGif_2.gif", // "< 2 m — Temps de traitement par document" tile
      "/photos/ocrGif_1.gif", // "99,2% — Précision moyenne d'extraction" tile
      "/photos/ocrGif_3.gif", // "30+ — Types de documents reconnus" tile
    ],
  },

  wicloud: {
    // site: "https://wicloud.example.com",           // live URL — framed in the hero + homepage device screens (desktop)
    // siteMobile: "https://wicloud.example.com/m",   // live URL for the phone frame only; defaults to `site` — rarely needed
    // cover: "/photos/wicloud-cover.jpg",             // 1600×1000 — grid card, "La plateforme" panel, "Solutions liées" card
    highlight: "/photos/highlight_test.jpg", // 2400×1200 — homepage carousel card; setting this switches the card to a photo
    // screenshot: "/photos/wicloud-desktop.jpg",     // 2560×1600 — plain screenshot shown inside the drawn laptop
    // screenshotMobile: "/photos/wicloud-mobile.jpg",// 1170×2532 — same screen, inside the drawn phone
    // mockup: "/photos/wicloud-mockup.jpg",          // finished mockup that already contains a device — replaces the drawn laptop entirely
    // preview: "/videos/wicloud-preview.gif",        // looping GIF — the 3D globe's hover card
    // video: "/videos/wicloud-presentation.mp4",     // 16:9 — the scroll-stretched "Vidéo de présentation"
    // videoPoster: "/photos/wicloud-presentation-poster.jpg", // 1920×1080 — first frame, shown while the video buffers
    gallery: [
      null, // Supervision temps réel des ressources
      null, // Gestion des instances et du stockage
      null, // Présentation vidéo de la console WICLOUD  (video-slot)
    ],
    // statGifs: [null, null, null],                  // only read while highlightVariant is "cards-gif" — WICLOUD uses "image" instead (see `highlight` above)
  },

  wifacility: {
    // site: "https://wifacility.example.com",        // live URL — framed in the hero + homepage device screens (desktop)
    // siteMobile: "https://wifacility.example.com/m",// live URL for the phone frame only; defaults to `site` — rarely needed
    // cover: "/photos/wifacility-cover.jpg",          // 1600×1000 — grid card, "La plateforme" panel, "Solutions liées" card
    // highlight: "/photos/wifacility-highlight.jpg",  // 2400×1200 — homepage carousel card; services.ts forces the photo layout without one, so the empty card still shows this size hint
    // screenshot: "/photos/wifacility-desktop.jpg",   // 2560×1600 — plain screenshot shown inside the drawn laptop
    // screenshotMobile: "/photos/wifacility-mobile.jpg", // 1170×2532 — same screen, inside the drawn phone
    // mockup: "/photos/wifacility-mockup.jpg",        // finished mockup that already contains a device — replaces the drawn laptop entirely
    // preview: "/videos/wifacility-preview.gif",      // looping GIF — the 3D globe's hover card
    // video: "/videos/wifacility-presentation.mp4",   // 16:9 — the scroll-stretched "Vidéo de présentation"
    // videoPoster: "/photos/wifacility-presentation-poster.jpg", // 1920×1080 — first frame, shown while the video buffers
    gallery: [
      null, // Suivi des échéanciers en temps réel
      null, // Évaluation et scoring d'un dossier
      null, // Parcours client de simulation d'achat échelonné
    ],
    // statGifs: [null, null, null],                  // only read while highlightVariant is "cards-gif" — WIFACILITY uses "image" instead
  },

  setycore: {
    site: "https://wi-univers-release.admin.setycorp.net/", // live URL — framed in the hero + homepage device screens (desktop). No siteMobile: its login page isn't responsive, so the mobile preview looks clipped — that's the site's own rendering, not the frame's
    // siteMobile: "https://setycore.example.com/m",  // live URL for the phone frame only; defaults to `site` — rarely needed
    // cover: "/photos/setycore-cover.jpg",            // 1600×1000 — grid card, "La plateforme" panel, "Solutions liées" card
    // highlight: "/photos/setycore-highlight.jpg",    // 2400×1200 — homepage carousel card; setting this switches the card to a photo
    // screenshot: "/photos/setycore-desktop.jpg",     // 2560×1600 — plain screenshot shown inside the drawn laptop
    // screenshotMobile: "/photos/setycore-mobile.jpg",// 1170×2532 — same screen, inside the drawn phone
    // mockup: "/photos/setycore-mockup.jpg",          // finished mockup that already contains a device — replaces the drawn laptop entirely
    // preview: "/videos/setycore-preview.gif",        // looping GIF — the 3D globe's hover card
    // video: "/videos/setycore-presentation.mp4",     // 16:9 — the scroll-stretched "Vidéo de présentation"
    // videoPoster: "/photos/setycore-presentation-poster.jpg", // 1920×1080 — first frame, shown while the video buffers
    gallery: [
      null, // Statistiques de vente en temps réel
      null, // Parcours d'achat côté client
      null, // Démonstration de la marketplace SETYCORE  (video-slot)
    ],
    // statGifs: [null, null, null],                  // only read while highlightVariant is "cards-gif" — SETYCORE uses the default "cards" (stats) layout instead
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
  revealVideo: "/videos/lp_video2s.mp4" as Asset,
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
  const hero = media.cover
    ? { ...service.media.hero, src: media.cover }
    : service.media.hero;
  const stats = service.stats.map((stat, index) => {
    const gif = media.statGifs?.[index];
    return gif ? { ...stat, gif } : stat;
  });

  return {
    ...service,
    stats,
    ...(media.site ? { previewUrl: media.site } : {}),
    ...(media.siteMobile ? { previewMobileUrl: media.siteMobile } : {}),
    ...(media.screenshot ? { showcaseImage: media.screenshot } : {}),
    ...(media.screenshotMobile
      ? { showcaseMobileImage: media.screenshotMobile }
      : {}),
    ...(media.mockup ? { showcaseMockup: media.mockup } : {}),
    ...(media.preview ? { previewGif: media.preview } : {}),
    ...(media.video ? { presentationVideo: media.video } : {}),
    ...(media.videoPoster ? { presentationPoster: media.videoPoster } : {}),
    // Supplying a card photo *is* the request for the photo layout. Deriving it here rather
    // than making it a second thing to remember in services.ts: setting one and forgetting
    // the other gave either a photo the layout never showed, or a layout with no photo.
    ...(media.highlight
      ? { highlightImage: media.highlight, highlightVariant: "image" as const }
      : {}),
    media: { ...service.media, hero, gallery },
  };
}
