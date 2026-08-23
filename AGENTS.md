<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- Everything below MUST stay outside the block above: `next dev` regenerates
     that block and will silently delete anything placed inside it. -->

# Wissal Univers — marketing site

IT solutions agency site. One Apple-`/macbook-pro`-style long-form homepage presenting every
solution, plus one rich sub-landing page per solution. Copy language is **French**, and all
current copy is a first draft the client will revise.

## Stack decisions

- App Router, single package (the `pnpm-workspace.yaml` only configures install policy).
- Tailwind v4 with `@theme` tokens in `app/globals.css`. HeroUI is installed but unused —
  custom primitives in `components/ui` give tighter control over the visual language.
- GSAP + ScrollTrigger for scroll reveals (`lib/gsap.ts`); `embla-carousel-react` for the
  horizontal reels.
- 3D: `@react-three/fiber` + `drei`. No postprocessing dependency — glow is faked with
  additive-blended canvas-gradient sprites and a hand-written fresnel shader.
- Palette is a **cool family plus exactly one warm accent**; invent no other hues. The
  cool brand values are `--color-paper #FFFFFF`, `--color-teal #379F9E`,
  `--color-steel #366479`, `--color-ink #354666`; the warm accent is
  `--color-ember #C5522C`. Everything else is a tint or shade of one of those, added only
  to make text legible: `--color-mist #EEF2F6`, `--color-abyss #26334C`,
  `--color-aqua #7FC9C8`, `--color-teal-deep #2B7D7C`, `--color-steel-pale #9FBDD0`,
  `--color-ember-soft #F2A48A`, `--color-ember-hot #FF4100`.

### The warm accent, and why it stays rare

An all-teal/slate site reads flat, so `ember` breaks it. Where it goes:

- **Primary CTAs** — `Button` primary, the navbar CTA, both contact submits.
- **Eyebrow "mini titles"** — every `SectionHeading` badge, plus the hand-written ones in
  `Hero`, `Reliability` and `SolutionHero`. This is the widest use, and it works because
  an eyebrow is small, uppercase and sits above a cool heading.
- **Section 2 (`HighlightsReel`)** — card category labels, the "Découvrir X" CTAs, the
  middle stat tile's glow, the hand-drawn underline under "L'essentiel", and the card
  edge. That edge is a **hairline, not a neon bloom**: one tight `0 0 12px -4px` ember
  glow plus a `border-ember/55`, sized to separate one card from the next and nothing
  more. It replaced a four-layer aqua bloom that lit up the whole section.
- **The 3D scene** — the service markers **alternate warm/cool by index** (`index % 2`,
  an even 2/2 split across the four solutions), and the marker pill's icon is `ember`.
  Hover then escalates to `ember-hot` with a white orb core and a brighter glow, so the
  active state still reads on a marker that is already warm — don't "simplify" that back
  to a plain warm/cool swap or hovering a warm marker becomes invisible. Also: the warm
  equatorial belt, active arcs, one warm rim light, one warm nebula, one warm debris
  shard, and the meteors.
- **The globe's hover card** — border, category mini title, "Découvrir" link, and the
  preview placeholder's badge and one blur blob.

Still cool on purpose: headings, body copy, audience/link tags (`SolutionsGrid`,
`ConnectedSolutions`, `SolutionFinder`), `Tabs`, form focus rings, and the per-solution
identity colours in `paletteBg`/`paletteBorder`. Ember marks structure and actions; the
solutions keep their own cool identity.

`#C5522C` is not an arbitrary warm tone. At L=0.181 it is the *lightest* warm value that
still holds a white label at 4.5:1 (4.55:1) while also passing as small text on white
(4.55:1) — go any brighter and both fail at once. `#FF4100` peaks at 3.5:1 on white and
2.7:1 on ink, so it can never carry text; it lives as `ember-hot` for additively-blended
3D glows and the marker hover state, where there is no contrast floor.

The flip side: **`ember` is dim on dark surfaces** — 2.08:1 on ink, 2.62:1 on the marker
pill's glass panel. That is below the 3:1 icon guideline, and it is a deliberate,
client-requested choice for the marker pill icon specifically. Anywhere else on a dark
ground, reach for `ember-soft` (5.9:1 on the pill) or the `.text-warm` variable, which
picks it automatically.

The fill is the same `ember` on *both* grounds, so the CTA looks identical site-wide. What
a dark ground can't give it is an edge (ember on ink is 2.08:1), so `.control-warm` adds a
1px `ember-soft` inset ring there — 4.7:1 against ink, which carries the 3:1 non-text
requirement at the boundary instead. Accent *text* still has to flip: `--warm-text` is
`ember` on light and the `ember-soft` tint on dark. Utilities: `.control-warm` (filled
CTA), `.text-warm`, `.border-warm/40`, `.fill-warm` (SVG).

### `.on-dark-raised` — why the highlight cards need their own tints

The cards start lighter than a section and lighten *further* on hover (`bg-[#354666]` →
`bg-[#3f5578]`), which is a deliberate effect the client asked for. It also costs every
standard dark tint its 4.5:1: on the hovered card `aqua` drops to 3.99, `steel-pale` to
3.83, `ember-soft` to 3.76. The resting card has only **0.005** of luminance headroom
before that happens, so a card cannot both lighten visibly and use the section tints.

`.on-dark-raised` (on `CARD_SHELL`, alongside `.on-dark`) overrides `--warm-text`,
`--accent-text` and the `--pt-*` trio with a paler set that clears 4.5:1 in *both* the
resting and hovered states. **Audit the cards in their hover state**, not just at rest —
these failures were live for a while precisely because a resting-state audit misses them.
Pin the state before auditing: `card.style.backgroundColor = '#3f5578'`.

### Accent colours are ground-adaptive, and that is not optional

Both accents are mid-tones and fail WCAG AA (4.5:1) for small text on *at least one* ground:

| hex | on `paper` | on `ink` |
| --- | --- | --- |
| `teal #379F9E` | 3.2:1 ✗ | 3.0:1 ✗ |
| `steel #366479` | 6.5:1 ✓ | 1.5:1 ✗ |
| `aqua #7FC9C8` | 1.9:1 ✗ | 5.0:1 ✓ |
| `teal-deep #2B7D7C` | 4.9:1 ✓ | — |
| `steel-pale #9FBDD0` | — | 4.8:1 ✓ |

So **no single hex works for accent text**. `app/globals.css` resolves it with CSS variables
that a dark ground overrides, which means nesting alone picks the right value:

- `--accent-text` → `.text-accent`, `.border-accent/40` — the generic accent (eyebrow badges,
  inline links). Used by `SectionHeading`, `Navbar`, `SolutionsGrid`.
- `--accent-fill` / `-label` / `-hover` → `.control-accent` — filled controls. Used by
  `Button` (primary), `Tabs` (active), and the contact-form submits. Each ground gets the
  tint/shade that clears 4.5:1 for the label *and* 3:1 for the control's own edge.
- `--pt-teal` / `--pt-aqua` / `--pt-steel` → `.pt-*`, which is what `paletteText` in
  `lib/palette.ts` returns. A solution's palette token names a **role**, not a hex; the
  ground picks the value. `teal` and `aqua` converge on dark grounds — `aqua` *is* the light
  tint of teal — and the per-solution identity is carried by `paletteBg` / `paletteBorder`,
  which keep the exact brand hex (fills and borders only need 3:1).

The override applies under `.section-ink`, `.section-abyss`, `.bg-ink`, `.bg-abyss`, and
`.on-dark`. **`.on-dark` is the escape hatch** for a dark surface that uses none of those —
the `Navbar` (transparent over the hero, glass-panel over light sections) and the
`HighlightsReel` cards (arbitrary-value `bg-[#354666]`). It sets only the variables, no paint.

Rules of thumb: plain `text-teal` / `text-steel` never belongs on small text — use the
adaptive class. Plain `teal` is correct for fills, glows, borders and display type ≥24px.
`text-aqua` / `text-teal-deep` are fine only in a component that renders on exactly one
ground, and `git grep` for the section wrapper before assuming which.

There is a contrast audit snippet worth re-running after any palette change: walk every
element with a text node, resolve its nearest opaque ancestor background, and assert
4.5:1 (or 3:1 for ≥24px / ≥18.66px bold). All five routes currently report zero failures.
It has caught real bugs every time it ran, so run it rather than reasoning about it —
skip elements under `header` and any non-opaque colour, which it cannot resolve by
walking ancestors (those pairings were checked by hand).

## Content model

`lib/data/services.ts` exports `SERVICES`, the single source of truth for both the homepage
and `/solutions/[slug]`. Adding a solution means adding one entry there — no other file
should hardcode the list. Current four: **OCR** (data extraction), **WICLOUD** (cloud infra),
**WIFACILITY** (installment payment, contains the bank-facing **Etaysir** admin panel), and
**SETYCORE** (marketplace).

Real logos/screenshots/videos don't exist yet. Every media slot is a placeholder descriptor
(`kind: "mock-dashboard" | "mock-scan" | ...`) rendered as generated art, never a broken
`<img>`. Swapping in real assets means changing only the `media` field.

**Project preview GIFs:** `Service.previewGif` is an optional path shown in the globe's hover
card. Drop a file in `public/` (e.g. `public/previews/ocr.gif`) and set
`previewGif: "/previews/ocr.gif"` on that service. Until set, the card renders a labelled
placeholder. It uses a plain `<img>` on purpose — `next/image` would strip GIF animation.

**Highlights cards** (homepage carousel) come in two layouts, chosen per service via
`Service.highlightVariant`:

- `"cards"` (default, or field omitted) — copy at the top, the service's three `stats`
  rendered as large data tiles below. The middle tile always takes the warm `ember` glow
  regardless of the service; the outer two carry that solution's own cool pairing. One warm
  tile between two cool ones is what gives the card a focal point.
- `"image"` — `Service.highlightImage` fills the whole card edge to edge with the copy laid
  over it behind a scrim, and the CTA pinned to the bottom.

For the `"image"` layout, design the photo at **2400 × 1200 px (2:1)**, JPG/PNG/WebP; drop in
`public/` (e.g. `public/highlights/wifacility.jpg`) and set
`highlightImage: "/highlights/wifacility.jpg"`. Rendered via `next/image` with `fill` +
`object-cover`, so it's auto-resized per breakpoint, converted to a modern format and cached —
but the visible crop shifts with viewport, so keep important content in the middle ~80% and
treat the edges as bleed. A shimmer skeleton covers decode, then the photo cross-fades in and
scales gently on card hover. With no image set the card shows a placeholder stating the size.

## Hero / 3D scene (`components/three/EarthNetwork.tsx`)

Hard-won details worth preserving:

- **The label portal must share the canvas's exact bounds.** drei's `Html` positions labels
  relative to the canvas, so anchoring the portal `<div>` to the section instead offsets every
  label by the canvas inset. It lives as a sibling of `<Canvas>` inside the same wrapper.
- **That wrapper deliberately has no `z-index`.** An absolute element with `z-auto` creates no
  stacking context, so the inner label overlay (`z-20`) still layers above the copy scrim
  (`z-5`) while the canvas itself stays below it.
- **Markers and arcs live inside the same spinning group as the globe**, so they stay locked to
  the surface. Rotating the globe in its own inner group was why they once looked detached.
- **Arcs hug the sphere** because each bezier control point sits at `radius / cos(halfAngle)`,
  which approximates a circular arc instead of cutting a chord through the globe.
- **`OrbitControls.target` always renders at screen centre.** Moving the globe's group does not
  shift it on screen; to place the globe off-centre, inset the canvas element instead.
- Procedural geometry uses a pure `hash(index)` helper, never `Math.random()` during render
  (React's purity rule). One-time random work goes in a lazy `useState` initialiser.
- Camera rotation is unconstrained (full 360°, over the poles) with damping.

## `PerformanceMetrics` is a textured light section

It is the one section painted **white with a texture** rather than flat: an ink dot grid
at 0.13 alpha (the same grid the dark sections use, inverted, so both grounds share one
visual language) over two soft `mist` washes for depth. Its data tiles stay `bg-ink` on
that light ground — the numbers should be the loudest thing in the section, and `.bg-ink`
carries the dark-ground accent overrides so the tokens inside resolve correctly without
being touched.

Two things to preserve if you edit it:

- **The dot grid is masked at the bottom.** The next section (`DataIntelligence`) is the
  same white, so an abrupt end to the grid becomes the only thing marking the boundary and
  reads as a stray line instead of a section change. The top needs no mask — it meets the
  dark `HighlightsReel`, where the colour change does the work.
- **Alpha lives in the colour, not an `opacity-*` class**, so the grid can't be lightened
  twice, and the `Container` needs `relative` or it renders under the texture layers.

Note this leaves two light sections adjacent (`PerformanceMetrics` → `DataIntelligence`).
The texture and the dark tiles carry the distinction; if more light sections land in a row,
the rhythm is worth revisiting rather than adding more texture.

## Section 2 autoplay is gated on visibility

`HighlightsReel`'s deck and its countdown only run while the section is on screen
(`autoplay = inView && playing && !reduceMotion`). Without the gate it advances during
the hero, so a visitor arrives at card 3 with the countdown mid-cycle. Leaving view also
resets the countdown, so coming back always starts a fresh card.

The observer uses `rootMargin: "-20% 0px -20% 0px"` with **no threshold** on purpose. This
section is usually taller than the viewport, so its intersection ratio can never reach a
value like 0.35 on a short window and a threshold-based gate would never fire at all. The
inset root instead asks "does the section overlap the middle 60% of the viewport", which
holds at any section height.

Testing this in an automated tab is awkward: `requestAnimationFrame` never runs when the
tab reports `document.hidden`, and IntersectionObserver delivery is tied to the frame
lifecycle — so **no** observer fires, including the long-standing underline one. Taking a
screenshot forces a paint, which delivers the pending records and starts the deck. Sample
the progress fill's inline width (`autoplay ? progress : 100`, so a literal `100%` is the
"off" sentinel) rather than trusting a single reading: each tool call takes seconds while
the countdown keeps ticking.

## The hero → Section 2 seam (vignette)

The hero paints `ink` and `HighlightsReel` paints `abyss`, so the boundary was a visible
colour step, and on `lg` the 3D canvas stops at `bottom-[16%]` and ended on a hard
horizontal line. Three pieces fix it, and they only work together:

1. **Radial vignette** inside the canvas wrapper (`z-10`), so it covers exactly the canvas
   bounds — above the canvas (`z-auto`), below the marker labels (`z-20`) and copy (`z-30`).
   Darkens the frame so the globe sits in space rather than in a rectangle.
2. **Section-level bottom falloff** on the hero (`h-[45%]`, fading to `abyss`). It must be
   scoped to the *section*, not the canvas: on `lg` a canvas-scoped fade leaves a sliver of
   the hero's own `ink` showing between it and the copy band's scrim.
3. **Limb glow** at the top of `HighlightsReel`, so the earth reads as continuing behind
   the copy.

Two traps, both of which drew the exact hard line the vignette exists to remove:

- **Don't let the glow end opaque.** An opaque gradient hides *this* section's dot texture
  while the hero's stays visible, and that texture discontinuity reads as a hard edge. The
  glow block therefore sits **before** the dot overlay in the DOM, so the dots run unbroken.
- **Don't let the glow start at full strength.** Beginning it at the boundary steps from
  no-glow (hero side) to full-glow (this side). It's masked with
  `linear-gradient(to bottom, transparent 0%, black 42%, transparent 100%)` so both sides
  agree on the seam itself and the glow blooms just below it.

Verify by parking the seam mid-viewport and zooming a narrow band across it — a JPEG
screenshot of the whole page is too coarse to show a 1-2 value step.

## Homepage section map (Apple `/macbook-pro` → Wissal Univers)

All ~20 reference sections have an equivalent; components live in `components/sections/` and
are composed in order in `app/page.tsx`: Hero, HighlightsReel, PerformanceMetrics,
DataIntelligence, Reliability, PlatformShowcase, ConnectedSolutions, AudienceTabs, ScaleSpecs,
OcrDemo, Integrations, Security, SolutionFinder, MigrationProgram, WhyUs, SolutionsGrid,
DataCommitment, Values, FAQHome, Contact, plus `components/layout/Footer.tsx`.

## Sub-landing page

`app/solutions/[slug]/page.tsx` with `generateStaticParams` from `SERVICES`, reused by all
four: hero, story/stats, features, steps, sub-projects (Etaysir), media gallery + demo CTA,
FAQ, contact, related solutions.

## Known environment quirk

In headless/automated browser sessions the tab reports `document.hidden === true`, which
throttles `requestAnimationFrame` — the WebGL canvas renders blank and GSAP tweens stall until
a real interaction (click/drag) nudges the loop. This is a tooling artifact, not a bug; real
users on a focused tab never hit it.

## Open items

- All copy is a first-draft placeholder.
- No real media yet; placeholder descriptors and no `previewGif` values.
- Only 4 solutions modeled; the registry is built to extend.
