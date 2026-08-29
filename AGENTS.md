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
current copy is a first draft the client will revise..

## Stack decisions

- App Router, single package (the `pnpm-workspace.yaml` only configures install policy).
- Tailwind v4 with `@theme` tokens in `app/globals.css`. HeroUI is installed but unused —
  custom primitives in `components/ui` give tighter control over the visual language.
- GSAP + ScrollTrigger for scroll reveals (`lib/gsap.ts`); `embla-carousel-react` for the
  horizontal reels.
- 3D: `@react-three/fiber` + `drei`. No postprocessing dependency — glow is faked with
  additive-blended canvas-gradient sprites and a hand-written fresnel shader.
- Palette is a **cool family plus exactly one signal accent**; invent no other hues. The
  cool brand values are `--color-paper #FFFFFF`, `--color-teal #379F9E`,
  `--color-steel #366479`, `--color-ink #354666`; the signal accent is
  `--color-signal #13C182`. Everything else is a tint or shade of one of those, added only
  to make text legible: `--color-mist #EEF2F6`, `--color-abyss #26334C`,
  `--color-aqua #7FC9C8`, `--color-teal-deep #2B7D7C`, `--color-steel-pale #9FBDD0`,
  `--color-signal-soft #4ED39D`, `--color-signal-deep #0D7D55`,
  `--color-signal-bright #00FFA9`.
  The accent was a warm `ember #C5522C` until the client replaced it with this green; if
  you find an orange anywhere it is a leftover, not a deliberate exception.

### The signal accent, and why it stays rare

An all-teal/slate site reads flat, so `signal` breaks it. Where it goes:

- **Primary CTAs** — `Button` primary, the navbar CTA, both contact submits.
- **Eyebrow "mini titles"** — every `SectionHeading` badge, plus the hand-written ones in
  `Hero`, `Reliability`, `SolutionHero` and `DeviceShowcase`. This is the widest use, and
  it works because an eyebrow is small, uppercase and sits above a cool heading.
- **The hand-drawn underline** (`components/ui/HandUnderline.tsx`) — under "L'essentiel" in
  `HighlightsReel` and under the service name in `DeviceShowcase`. Shared component rather
  than a duplicated 1.1KB path; it fills with `.fill-signal`, so the ground picks the value
  and the caller owns the animation (`underline-draw` to wipe it in, `opacity-0` to hold).
- **Section 2 (`HighlightsReel`)** — card category labels, the "Découvrir X" CTAs, the
  middle stat tile's glow, the hand-drawn underline under "L'essentiel", and the card
  edge. That edge is a **hairline, not a neon bloom**: one tight `0 0 12px -4px`
  `rgba(19,193,130,…)` glow plus a `border-signal/55`, sized to separate one card from the
  next and nothing more. It replaced a four-layer aqua bloom that lit up the whole section.
  The edge uses the brand value at full strength on both card states — 4.05:1 at rest,
  3.23:1 hovered — so it keeps its 3:1 boundary without a raised-surface tint.
- **The 3D scene** — the service markers **alternate signal/cool by index** (`index % 2`,
  an even 2/2 split across the four solutions), and the marker pill's icon is `signal`.
  Hover then escalates to `signal-bright` with a white orb core and a brighter glow, so the
  active state still reads on a marker that is already green — don't "simplify" that back
  to a plain accent/cool swap or hovering an accented marker becomes invisible. Also: the
  equatorial belt, active arcs, one rim light, one nebula, one debris shard, and the
  meteors.
- **The globe's hover card** — border, category mini title, "Découvrir" link, and the
  preview placeholder's badge and one blur blob.

Still cool on purpose: headings, body copy, audience/link tags (`SolutionsGrid`,
`ConnectedSolutions`, `SolutionFinder`), `Tabs`, form focus rings, and the per-solution
identity colours in `paletteBg`/`paletteBorder`. The accent marks structure and actions;
the solutions keep their own cool identity.

**`#13C182` is a bright mid-tone (L=0.399), which inverts every constraint the old warm
accent had.** It is strong on dark grounds and weak on light ones:

| hex | on `paper` | on `ink` | on `abyss` |
| --- | --- | --- | --- |
| `signal #13C182` | 2.34:1 ✗ | 4.05:1 ✗ | 5.41:1 ✓ |
| `signal-soft #4ED39D` | 1.89:1 ✗ | 5.01:1 ✓ | 6.70:1 ✓ |
| `signal-deep #0D7D55` | 5.14:1 ✓ | — | — |

Three consequences, all of them load-bearing:

- **The filled CTA takes a dark label, not white.** `paper` on `signal` is 2.34:1;
  `abyss` on it is 5.41:1. That is `--signal-fill-label`.
- **The ring moved to the *light* ground.** `signal` on ink is 4.05:1, so a dark ground
  gives the control its own edge for free; on paper it is 2.34:1 and fails the 3:1
  non-text floor, so `.control-signal` adds a 1px `signal-deep` inset ring there (5.14:1
  on paper). This is the exact opposite of what `ember` needed — don't "restore" it.
- **Accent text flips the usual way round.** `--signal-text` is `signal-deep` on light and
  `signal-soft` on dark; the brand value itself never carries small text on either ground.
  `signal-deep` also clears `mist` (4.57:1), which `ember` never did (4.04:1).

`#00FFA9` peaks at 1.3:1 on paper, so it can never carry text; it lives as `signal-bright`
for additively-blended 3D glows and the marker hover state, where there is no contrast
floor.

Utilities: `.control-signal` (filled CTA), `.text-signal`, `.border-signal/40`,
`.fill-signal` (SVG). The 3D scene keeps its own constants — `SIGNAL`, `SIGNAL_SOFT`,
`SIGNAL_BRIGHT` in `EarthNetwork`.

### `.on-dark-raised` — why the highlight cards need their own tints

The cards start lighter than a section and lighten *further* on hover (`bg-[#354666]` →
`bg-[#3f5578]`), which is a deliberate effect the client asked for. It also costs every
standard dark tint its 4.5:1: on the hovered card `aqua` drops to 3.99, `steel-pale` to
3.83, `signal-soft` to 4.00. The resting card has only **0.005** of luminance headroom
before that happens, so a card cannot both lighten visibly and use the section tints.

`.on-dark-raised` (on `CARD_SHELL`, alongside `.on-dark`) overrides `--signal-text`,
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
4.5:1 (or 3:1 for ≥24px / ≥18.66px bold). All routes currently report zero failures.
It has caught real bugs every time it ran, so run it rather than reasoning about it —
skip elements under `header` and any non-opaque *background*, which it cannot resolve by
walking ancestors (those pairings were checked by hand).

**Composite the foreground through a canvas, never by parsing the colour string.** Chrome
serializes Tailwind's `/opacity` colours as `lab(L a b / alpha)`, and a numeric regex reads
those four numbers as if they were rgb+alpha — catastrophically wrong in both directions:
`text-paper/70` on a dark ground reported **1.16:1** (a false failure; it is really 7.1:1)
and `text-ink/80` on paper reported **11.3:1** (a false pass that happened to be fine; it
is really 5.4:1). Fill a 1×1 canvas with the resolved background, fill again with
`getComputedStyle(el).color`, and read the pixel — canvas parses any CSS colour and does
the alpha blend for you.

Note this also means `opacity: 0.7` on an *element* is invisible to the audit either way:
it reads `color`, not the inherited opacity. `SectionHeading`'s `opacity-70` descriptions
are a site-wide near-miss for exactly that reason (ink at 70% on paper is 4.12:1) — prefer
`text-ink/80` for new body copy on paper.

## Content model

`lib/data/services.ts` exports `SERVICES`, the single source of truth for both the homepage
and `/solutions/[slug]`. Adding a solution means adding one entry there — no other file
should hardcode the list. Current four: **OCR** (data extraction), **WICLOUD** (cloud infra),
**WIFACILITY** (installment payment, contains the bank-facing **Etaysir** admin panel), and
**SETYCORE** (marketplace).

### Every link, photo and video is in `lib/data/media.ts`

`services.ts` holds copy and structure and **no media at all**. Paths and external URLs live
in one registry, and `withMedia()` copies them onto each `Service` as `SERVICES` is built:

```
lib/data/media.ts ── SOLUTION_MEDIA[slug] ─┐
                     HOME_MEDIA            ├─→ withMedia() ─→ SERVICES
lib/data/services.ts ── copy + structure ──┘
```

So filling the site with real assets is one file to edit, and there is exactly one place to
look when something renders a placeholder. Rules that keep it that way:

- **Nothing else may hardcode an asset path.** `UniverseReveal` reads
  `HOME_MEDIA.revealVideo` rather than `"/videos/lp_video.webm"`; a component that needs a
  new asset gets a new key here, not a string literal.
- **Files go in `public/photos/` and `public/videos/`**, referenced without the `public`
  prefix (`"/photos/ocr-hero.jpg"`). An absolute URL works anywhere a path does: local
  images go through `next/image`, remote ones are served as-is (`unoptimized`), which is
  what lets a link be pasted in without registering its host in next.config.ts.
- **Gallery entries are positional.** `SOLUTION_MEDIA[slug].gallery[i]` fills the *i*-th
  slot declared in that solution's `media.gallery`, and `null` leaves it as its mock. The
  labels are repeated as comments in the registry so the two stay legible together; if you
  reorder slots in `services.ts`, reorder them here.
- **`cover` is the one field several sections share.** It fills `media.hero`, which is read
  by "Toutes nos solutions", "La plateforme" (the WIFACILITY / SETYCORE / WICLOUD panels
  only — OCR has none there), "Data & Intelligence" and "Solutions liées". Four appearances,
  one file. Before it existed, `media.hero` was the one slot with no key in the registry,
  which made four visible sections look unfillable.
- **`highlight` derives the card layout.** Supplying a carousel photo *is* the request for
  the photo variant, so `withMedia` sets `highlightVariant: "image"` alongside it. Two
  fields to remember meant setting one and forgetting the other — a photo the layout never
  showed, or a layout with no photo. `services.ts` can still force the variant without a
  photo, which is what WIFACILITY does to keep the size hint visible on the empty card.
- **The registry's header is the map.** It lists every field against the French section
  title it feeds, with pixel sizes. Keep it accurate — it is the only place that answers
  "where does this image go?", and a section renamed in a component has to be renamed there.
- **`withMedia` assigns conditionally**, so an absent key leaves the field `undefined`
  rather than writing `undefined` over it — every consumer reads "undefined" as "render the
  placeholder", so the difference matters.

Real logos/screenshots/videos don't exist yet. Every media slot is a placeholder descriptor
(`kind: "mock-dashboard" | "mock-scan" | ...`) rendered as generated art, never a broken
`<img>`. Swapping in real assets means changing only the `media` field.

**Device showcase images.** `DeviceShowcase` takes photos two ways, because both kinds of
asset exist in the wild:

- `Service.showcaseImage` (**2560 × 1600 / 16:10**) and `Service.showcaseMobileImage`
  (**1170 × 2532 / 9:19.5**) are **plain screenshots**, rendered inside the drawn frames.
  Prefer these — they keep every solution on the same device.
- `Service.showcaseMockup` is an image that **already contains the device** (a finished
  mockup like `public/service1.jpg`), and replaces the drawn laptop rather than going
  inside it. Without this field such an image renders as a laptop nested in a laptop.
  **Matte it on black or export it transparent**: it is composited with `mix-blend-screen`,
  which makes black vanish into the ground (see the section notes below).

Drop files in `public/` and set the field; until then each frame draws a generated on-brand
mock rather than a broken image.

**Live project previews:** `Service.previewUrl` embeds the real site in the device frames
and the solution hero — see "Live previews" under `DeviceShowcase`. Each solution has a
commented `previewUrl` slot in `lib/data/services.ts`; paste the URL and nothing else needs
touching. A host that refuses to be framed falls back to `showcaseImage`, then to the mock.

**Project preview GIFs:** `Service.previewGif` is an optional path shown in the globe's hover
card. Drop a file in `public/` (e.g. `public/previews/ocr.gif`) and set
`previewGif: "/previews/ocr.gif"` on that service. Until set, the card renders a labelled
placeholder. It uses a plain `<img>` on purpose — `next/image` would strip GIF animation.

**Highlights cards** (homepage carousel) come in two layouts, chosen per service via
`Service.highlightVariant`:

- `"cards"` (default, or field omitted) — copy at the top, the service's three `stats`
  rendered as large data tiles below. The middle tile always takes the `signal` glow
  regardless of the service; the outer two carry that solution's own cool pairing. One
  accented tile between two cool ones is what gives the card a focal point.
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

## The background sky (`EarthNetwork`)

The sky is **stars, gas and meteors — nothing else**. It used to carry a ringed planet, a
moon, a gas giant, connect-the-dots constellations and tumbling geometric shards; against
a real starfield those read as cartoon props, so they're gone. Meteors stay because they
are motion rather than scenery. Don't reintroduce named objects.

What makes it work, in rough order of impact:

- **`sizeAttenuation={false}` on every star layer.** This is the one that matters. The
  shells sit 7-95 units out while the camera is 6-14 units from the globe, so *attenuated*
  points collapse to sub-pixel and the entire field renders invisible — only the ~170
  nearest stars ever drew, which is why the sky looked empty. Point size is in **pixels**
  here; depth comes from per-shell pixel size (5 / 3.4 / 2.5 / 1.8) and from the differing
  rotation rates, not from perspective.
- **A mapped sprite (`starTexture`).** THREE draws `points` as hard **squares** unless the
  material has a map with alpha. That alone is most of what makes a procedural starfield
  look cheap.
- **`vertexColors` + a high brightness floor.** Colour varies inside the brand family
  (mostly `paper`, a cool minority toward `aqua`, a few toward `signal`); brightness
  varies far more than hue. The floor is high (0.45) *because this sky's ground is mid-navy,
  not black* — a conventional quadratic falloff buries most of the field in the background.
- **Additive blending**, so stars read as light rather than as dots.
- **`BrightStars`** — four stars with a halo, a core and two crossed thin sprites
  (`spriteMaterial` scaled non-uniformly) forming diffraction spikes. This is the classic
  bright-star signature and the cheapest way to look photographed instead of generated. It
  works *because* it is rare and restrained: an early pass had them 2x the size and opacity
  and one landed on the wordmark, which read as lens flare. Keep them clear of the logo
  (top-left) and the copy band (bottom-left).
- **Gas is very faint** (0.055-0.07). It exists so the globe's back isn't empty and the
  frame has some colour temperature — not as visible clouds. Anything stronger competes
  with the stars and the sky starts looking illustrated again.

~9.6k points across 5 draw calls, so it is cheap; the cost is fill rate from the additive
sprites, not geometry.

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

`UniverseReveal` sits between them and is light too, so that stretch is two light sections
running — it gets away with it because it is a full-screen video with a masked headline and
cannot be confused with a flat white content section. `DeviceShowcase` (near-black) then
breaks the run before `DataIntelligence`, so the sequence is light → light → dark → light.
That is the ceiling: a third light section in a row is the point to revisit the rhythm
rather than to keep going.

## `UniverseReveal` — the video the word clips into

`components/sections/UniverseReveal.tsx`, the Apple `/macbook-pro` "Take a closer look"
beat, five screens of pinned scroll. In order: `public/lp_video.webm` full-bleed; the ground
resolving to paper with the camera sitting inside the counter of the "a" in "Wissal"; a long
zoom out until the whole word is legible, centred; the word lifts to its resting place; the
three-block pitch lands, one block at a time. The footage keeps playing inside the letters
throughout — the finished headline *is* the video.

The clipping is **one SVG mask, not a `background-clip: text`** — a `<video>` can't be a
background. A paper `<rect>` covers the stage with a `mask` whose only hole is the word, so
the video shows through the letters and nowhere else.

**`VEIL`'s two numbers are load-bearing together, and both ends have been wrong.** It was
briefly a hard cut, which popped — the ground and a giant letter edge arrived on the same
frame. But a long fade is no better: it has to finish while the camera is still inside the
counter, or the veil is still coming up when the zoom has already pulled back to whole
letters, and the "you are inside the a" beat is spent behind a half-transparent wash.
Short, early and eased (`[0.03, 0.13]`, `easeInOutSine`) satisfies both — it completes at
~37×, still within the letter. Ease it, too: a linear opacity ramp has a visible corner at
each end, which is what makes a short fade still read as a switch.

### The layout is the finale; the scroll holds the word below it

The copy column — eyebrow, `<h2>`, pitch — is the *settled* composition, laid out in normal
flow. The scroll doesn't build it; it holds the word `lift` px **below** its place there
until the `LIFT` window, then releases it. So "centred, alone" and "risen, with copy" are
the same layout seen twice, and there is no second set of coordinates to keep in sync.

`lift` is the distance from the h2's centre to the stage's centre, which is why the column
uses `pt-[18svh]` instead of `justify-center`: centring the column would leave only ~60px
of lift and the rise would not read as a move.

### `ZOOM_CHAR` and the counter constants

The opening frame sits inside the enclosed hole of the "a" (index 4). The letter is located
*exactly* — a `Range` over one character of the `<h2>`'s text node gives its rendered box in
the real font at the real size with the real tracking.

The counter itself can't be: there is no DOM API for a glyph's inner geometry, so
`COUNTER_EM` (0.138 — the bowl is far smaller than it looks) and `COUNTER_DROP` (0.205) were
**measured off screenshots**, not estimated. Estimating them put a letter stroke in frame
twice. Re-measure if the display face or `ZOOM_CHAR` changes: park mid-zoom at a known
scale, read the white region's bounding box off the screenshot, and divide back out.

### Two hard limits on how far the zoom can go

Both were hit in practice, and the second is the one that will bite again.

**Matrix precision.** The obvious transform, `translate(zx zy) scale(s) translate(-zx -zy)`,
has to compute `-zx * s`; at zx≈590 and s≈70 that's ~41,000, and the on-screen result is the
difference of two numbers that size. SVG matrices are single precision (~7 significant
digits), so the detail is gone. The word is therefore drawn in coordinates **local to the
zoom focus**, and the transform is just `translate(focus) scale(s)` — small translate, small
glyph coordinates, no cancellation.

**Blink's glyph rasterizer, `MAX_GLYPH_PX = 8500`.** Fixing the matrix was necessary but not
sufficient: past roughly 9,000px of effective em (`fontSize × scale`), SVG text geometry
decouples from the transform and the mask draws the *wrong part* of the letter — boundaries
move back toward the centre as the scale rises, which is impossible for a real zoom and is
the tell. Measured on this page: 60× at a 151px font (≈9,100px) is correct, 70× (≈10,600px)
is not. `startScale` is clamped to `MAX_GLYPH_PX / fontSize`.

The clamp binds on desktop (~56×) but not on a phone, where the font is small enough that
the requested scale (~206×) fits under it. So the opening frame differs by device: an
unbroken white field on mobile, and on desktop the counter with one wall of the bowl still
in shot. The desktop version reads better — a featureless white screen tells the viewer
nothing about where they are — so don't chase parity by lowering the mobile scale.

Lifting the ceiling means converting the word to a `<path>`, which costs a font-parsing
dependency and the "h2 is the source of truth" property. Not worth it unless the brief
changes.

### The pitch is staggered, and the numbers have to close

`PITCH_START` / `PITCH_SPAN` / `PITCH_STEP` give each block its own window instead of fading
the grid in as one slab. `STEP` is deliberately smaller than `SPAN`, so a block starts while
the one before is still settling — three fully separate fades read as three events rather
than one sequence. The last block ends at `START + 2·STEP + SPAN`; keep that below 1 or the
third block never finishes before the section unpins.

### The ghost, and why it has to clear before the copy lands

The veil doesn't jump to opaque white. It cuts to `1 - GHOST` (8%), so the footage stays
faintly readable as the section's ground for the whole zoom — that's the "faded video
background" look. It then closes the last 8% during the `COPY` window, so the finale sits
on **pure** paper.

That last step is not cosmetic. The eyebrow's accent is `signal-deep`, which clears 4.5:1
on white at 5.14:1 and on `mist` at 4.57:1 — so a dark tint behind it eats the margin fast:
5% takes it to ~4.5:1 and 8% to ~4.2:1, under the floor. Anything you add behind the copy
has to be pure `#fff` by the time the copy is visible. (The margin used to be thinner
still: the old `ember` was 4.55:1 on paper and already failed `mist` at 4.04:1, which is
why the ground here is `paper` and not the slightly cooler token. Keep it that way.)

The pitch bodies use `text-ink/80`, not the site's usual `opacity-70`: ink at 70% composited
on paper is 4.12:1, under the floor for this size. (That is a site-wide near-miss the audit
snippet misses, because it reads the element's own `color` and ignores the `opacity`
property.)

### The video is graded on the same ramp, because it ends up as type

`VIDEO_DIM` / `VIDEO_PUNCH` darken the footage (`brightness` 1 → 0.5, `contrast` 1 → 1.15)
on the veil cut. Full-bleed at the start it is a picture and keeps its full range; from the
cut on it is the fill of a headline on white and needs contrast.

This is not decorative. `object-cover` on a portrait viewport crops to the middle of the
frame, which is where this footage is brightest — ungraded, the mobile finale rendered
"ssal Univers" in near-white on white. At 0.5 the brightest pixel in the footage composites
to ~4.1:1 against paper, clear of the 3:1 display type needs, and the darks are untouched.

So there is a **constraint on any replacement footage**: it has to stay dark enough to hold
3:1 against paper inside the glyphs. The current clip has mean relative luminance 0.05
(~10.5:1) with only ~4% of pixels bright enough to fail on their own — star specks, which
read as texture. Bright or mid-key footage would need a heavier grade, or a tinted wash
inside the letters. Measure it rather than eyeballing: draw the `<video>` to a canvas and
histogram the luminance.

### Things that will break if "simplified"

- **The invisible `<h2>` is the layout source of truth.** It carries the heading semantics
  and sits in normal flow between the eyebrow and the pitch; `measure()` reads its box, its
  computed font size, and (via a Range) the zoom letter's box, and the SVG word is placed on
  top of it. Both wear the same `WORD_TYPE` class string, so the two can't drift. Delete the
  `<h2>` and the finale has no layout and no heading for assistive tech.
- **`WORD_TYPE` is a `clamp()`, not breakpoint steps**, so one measurement holds at every
  width instead of the word jumping a size mid-scroll. Its `whitespace-nowrap` is
  load-bearing: the SVG `<text>` is a single line that cannot wrap, so an `<h2>` that
  wrapped would stop describing it.
- **Start scale is derived, never hardcoded.** The opening frame has to land inside the
  counter; a multiplier tuned on a wide desktop shows whole letters on a tall phone. It's
  stage height ÷ counter height, then clamped by `MAX_GLYPH_PX` — ~56× at 1440×900, ~206× on
  a phone.
- **The zoom interpolates in log space** (`startScale ** (1 - t)`). A linear ramp across a
  50×–200× range is unusable: it crawls, then lunges.
- **Playback is gated on visibility only.** An earlier cut paused the video once the veil
  went opaque, which was free then because the headline had cross-faded to a gradient. It no
  longer is: the footage is the headline's fill for the whole finale.
- **CSS `position: sticky` pins the stage; ScrollTrigger is only a progress source**
  (`onUpdate` → direct DOM writes, no React state per frame). No pin-spacer is injected, so
  nothing fights the flex layout. The section needs `shrink-0` — its tall explicit height
  *is* the mechanism.
- **Reduced motion renders the finale directly** — same composition, video still inside the
  letters, just a still frame instead of a scroll. The section also drops to one screen tall.
  The pause button is a tri-state (`override ?? !reduceMotion`) so a visitor can still start
  it, and it stays mounted for the whole section because there is never a point where the
  video has stopped mattering.

The IntersectionObserver uses `rootMargin: "100% 0px"` — a screen of lead time to buffer
8 MB. `video.muted = true` is set imperatively in the effect: React doesn't render `muted`
as an attribute during SSR, and autoplay policies check the property, so the first `play()`
would otherwise be rejected.

## `DeviceShowcase` — the solutions on a laptop and a phone

`components/sections/DeviceShowcase.tsx`, modelled on Apple's tabbed device shot: devices
on the left, per-solution copy on the right, tabs underneath. Four swappable screens, one
tab per solution. Showing the laptop and the phone at once is what lets the section make
the "works at any size" claim without a second layout for it.

The two-column split is also what buys the devices their size back — stacked, the heading,
copy and tabs all eat the same vertical budget the devices need.

**Scroll is the single source of truth for which solution is showing.** The section is
pinned and its progress picks the screen; the tabs hold no state of their own — clicking
one scrolls the page to the offset where its solution is active (the inverse of `toRun`).
That is deliberate. A click-driven index *plus* a scroll-driven one means the next scroll
after a click silently overrides the click, and the two never agree while a smooth-scroll
is still animating.

The frames are **drawn in CSS, not photographed**, so any screenshot drops straight in.
A solution that instead supplies `showcaseMockup` (device included) replaces the whole
laptop rather than only what's on its screen — which is why the stage is built as an
invisible frame setting the height plus absolutely-positioned layers on top, rather than
one frame with screens inside it.

The service name carries the hand-drawn `HandUnderline` (signal). It needs the
`relative inline-block` span around the word — that is what the underline positions
against, and it keeps the rule the width of the word rather than the whole column.

### Live previews — `Service.previewUrl` and `components/ui/LivePreview.tsx`

Set `previewUrl` on a solution and the real site runs inside the frames: the laptop and
phone screens here, and the browser window in that solution's hero. It is rendered at a
**real viewport** (1440x900 / 390x845, matching the drawn screens' ratios) and scaled down,
not squeezed into a 300px-wide iframe — otherwise a responsive site serves its phone layout
to the laptop. Nothing else has to change: the frames already fall back to `showcaseImage`
and then to a generated mock, and the preview is layered over that fallback.

**Whether a frame is allowed is decided on the server, before it is mounted, and it has to
be.** Nothing the browser exposes to the parent document distinguishes "loaded
cross-origin" from "refused by `X-Frame-Options`" — measured in Chrome, both fire `load`,
both return `null` from `contentDocument`, and both throw `SecurityError` from
`contentWindow.location`. An earlier cut read `contentDocument` and had it exactly
backwards, treating every real cross-origin load as a failure. And a refused frame paints
an **opaque** Chrome error page, so letting the fallback show through a transparent frame
is not an option either.

So `app/api/preview-status/route.ts` reads `X-Frame-Options` and CSP `frame-ancestors`
server-side — the only place they are readable — and answers a boolean, cached 10 minutes.
It takes a **url that must already appear in `SERVICES`**; an endpoint that fetched
whatever it was handed would be an open SSRF proxy, and the allowlist is the only thing
stopping that. Keep it.

Three smaller things that were each a bug first:

- **No `loading="lazy"` on the frame.** Mounting is already gated by the caller, and lazy
  loading defers the fetch until the frame nears the viewport while `PREVIEW_TIMEOUT_MS`
  counts from mount — so a preview that mounted a little early hit its deadline having
  never started loading, and gave up for good.
- **The fit is measured synchronously, then kept in sync by a `ResizeObserver`.** Waiting
  for the observer's *initial* delivery is not safe: its callbacks ride the frame
  lifecycle, so in a throttled or background tab the first one may never arrive. A frame
  that gated its own mounting on that measurement sat at zero size until its deadline
  expired.
- **The layout effect depends on the server verdict.** The holder and frame are not in the
  DOM until the verdict is `true`, so both refs are null on the first commits; without
  re-running when that flips, the frame stays at 1:1 and shows the top-left corner of a
  1440px page.
- **`pointer-events-none` unless `interactive`.** This section is pinned, and a scrollable
  iframe under the cursor swallows the wheel events the pin is driven by. The copy column
  gets an "Ouvrir le site" link precisely because the frame itself is inert.

Do **not** point a `previewUrl` at this site's own origin while testing: it frames itself,
recurses, and hangs the tab.

### `mix-blend-screen` on mockups, and the stacking-context trap

A mockup matted on black is composited with `mix-blend-screen`: `screen(0, ground) ==
ground`, so the matte becomes the section and the device appears to float. It lifts the
image's own darks to the ground colour too, which is what the eye expects from a device
sitting on that ground.

**This only works because the ground is painted on the sticky stage, not on the section.**
`position: sticky` creates a stacking context, and a stacking context isolates blending —
a `mix-blend-*` child can only see what is painted *inside* the stage. With the colour on
`<section>` alone the computed style still said `screen`, the class was in the CSS, and the
matte stayed a solid black rectangle. If you ever move that background back up to the
section, the mockup silently breaks. The fastest way to check: set the stage's background
to something garish from the console and see whether the matte picks the colour up.

### The screens are navigable, and each device zooms

- **An activation shield, not a live iframe.** This section is scroll-driven, and a live
  iframe under the cursor swallows the wheel that drives it — so each device's frame sits
  behind a button, where the wheel reaches the page as usual, and a click hands the pointer
  over. `mouseleave` or Escape takes it back. Same contract as the solution hero's frame and
  as any embedded map.
- **Only the active layer may take clicks.** Every solution's layer is in the DOM at once and
  the ones *above* the active index are merely transparent — and a transparent layer still
  receives pointer events, so every inactive layer carries `pointer-events-none`.
- **Zoom is a transform, never a layout change.** The device keeps its box, so nothing around
  it reflows, the embedded page is never resized (a resize is a real reflow of someone else's
  page, on every frame), and Blink re-rasterises the frame at the new scale — verified: a
  cross-origin iframe scaled 1.5× stays crisp rather than upscaling a bitmap. The transform is
  written straight to the shell and `transition-transform` animates both directions; clearing
  it animates back. Recomputed on resize, and it un-transforms before re-measuring or the
  scale compounds.
- **A zoom is a modal.** It locks the page scroll (`lib/scrollLock.ts`) because scrolling is
  what changes the tab and would swap the very screen being looked at, and it sets
  `data-immersive` to hide the header — the sticky stage is a stacking context, so no z-index
  inside it can beat a fixed navbar. Backdrop at `z-30` (above the copy and tabs, which are
  `z-auto`), device at `z-40`, the stage-level Fermer button at `z-50` so it is not scaled up
  with the device.
- **Every exit path has to release the pointer too.** Escape, the backdrop and Fermer all go
  through `closeZoom`; a path that only cleared `zoomed` left the device still holding the
  wheel with its "Échap pour défiler" chip up after the modal was gone.

### Nothing ever remounts, so tabs never reload

Previews are real page loads. All of them are mounted as the section comes into range — an
IntersectionObserver at `rootMargin: "100% 0px"` seeds `seen` with every index — and none is
ever unmounted, so a tab is a cross-fade between layers that have already loaded.

Two things this depends on:

- **Mounting on *activation* is not enough.** It was, and the first visit to each tab was a
  blank frame waiting on a page load, which reads exactly like a refresh.
- **`PREVIEW_TIMEOUT_MS` must not unmount the frame.** The server probe has already cleared
  the host, so a frame past its deadline is merely slow: it stays mounted at opacity 0 behind
  the fallback and fades in whenever it paints. Unmounting threw the load away and reloaded
  the site on the next visit.

Things worth preserving:

- **`layerAlpha` only ever fades a layer *in*.** Screens stack with later ones on top and
  every layer below the current one stays fully opaque, so the stack is never see-through.
  A symmetric tent — fading each layer in *and* out — puts two half-transparent screens on
  screen at the crossover with the section's own background showing between them.
- **The stage is height-critical.** Heading, devices, copy and tabs all have to fit one
  viewport, and the devices are the only elastic part, so their width is capped by the
  height left over: `max-w-[min(64rem,calc((100svh-20.5rem)*1.6))]`. `min()` lets whichever
  of width or height is scarcer win. The `20.5rem` is what everything else in the stage
  costs vertically (pt-16 + pb-8, eyebrow and heading, two gap-4s, the tab row, the
  devices' own pb-4) and `1.6` is the device stack's width:height. If you add a line
  anywhere in the stage, raise the 20.5rem or the tabs go past the fold on a 760px-tall
  window.
- **On a normal desktop it is the column ratio, not that height cap, that sizes the
  laptop.** At 1440x900 the cap allows ~915px while the grid only offers ~880, so the cap
  never binds — which is why the grid is `2.5fr` against a copy column floored at `19rem`
  rather than the old `1.9fr / 1fr`. Widening the ratio is the lever; lowering the height
  constant on its own does nothing at that size. The `19rem` floor is what stops the
  features list wrapping to two lines per item and growing the stage.
- **The section wrapper is wider than the site's `Container`** (`max-w-[84rem]` vs 1280).
  The devices are the point of this section and 1280 caps them well below what the viewport
  can show; heading, grid and tabs all align to the same wider edge, so the section reads as
  deliberately wide rather than misaligned.
- **`on-dark` on the section is required, not decorative.** The ground is an arbitrary
  value (`#0f1520`), so none of the `.bg-ink` / `.bg-abyss` selectors that carry the
  dark-ground accent overrides match, and `.text-signal` / `.text-accent` would resolve to
  their light-ground values on a near-black section.
- **The tab row scrolls horizontally rather than wrapping.** A second row of tabs would
  change the stage height mid-scroll.
- **`pt-16` on the sticky stage clears the fixed navbar.** The stage centres its content in
  the viewport, so without it the accent eyebrow sits under the glass bar.
- **Reduced motion drops the pinning entirely**, which means there is no scroll position to
  read and the tabs have to drive the screens directly — hence the second effect that
  paints from `active` instead of from progress.

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
UniverseReveal, DeviceShowcase, DataIntelligence, Reliability, PlatformShowcase, ConnectedSolutions, AudienceTabs, ScaleSpecs,
OcrDemo, Integrations, Security, SolutionFinder, MigrationProgram, WhyUs, SolutionsGrid,
DataCommitment, Values, FAQHome, Contact, plus `components/layout/Footer.tsx`.

## Sub-landing page

`app/solutions/[slug]/page.tsx` with `generateStaticParams` from `SERVICES`, reused by all
four: hero, story/stats, features, steps, sub-projects (Etaysir), **presentation video**,
media gallery + demo CTA, FAQ, contact, related solutions.

### The hero is a browser window the visitor can stretch

`SolutionHero` (copy, server component) + `SolutionHeroStage` (ground, frame, state).
**Copy left at `35vw`, frame right with everything else.** The frame is a drawn browser
window — traffic lights, an address pill showing the host, and its controls — holding the
project's real site (`Service.previewUrl`, the same field the homepage device frames read).

The side-by-side split is what makes it a *window*: stacked under a full-width block of copy
the frame only ever got the height the copy left over, which on a 720px-tall desktop was a
3:1 sliver of a web page. Beside the copy it gets the section's whole height. The trade is a
narrow copy column, so the type ramp in `SolutionHero` is set for a ~30rem measure and the
headline caps at `xl:text-6xl` — WIFACILITY does not fit the column above that.

The column is `35vw`, **not** `35%`, and the same `35vw` is repeated on the inner content —
see the reflow note below. The frame is the remainder minus the gutters, so it lands around
59-62vw of visible width rather than a round number.

Three states, in one dimension, how much room the frame gets:

| state | what it is |
| --- | --- |
| `inset` | beside the copy at ~70% of the width, rounded and bezelled. Default. |
| `hero` | the copy collapses and the frame takes the **whole hero section**, edge to edge, still in the page |
| `full` | the frame fills the **screen** (Fullscreen API), and is the only state where the iframe accepts clicks |

**Leaving `full` returns to the state it was entered from** (`beforeFullRef`), not to
`hero`. Exiting fullscreen into a stretched hero the visitor never asked for reads as the
control having done two things at once.

What ends up on the screen, each layered *over* the next so a failure uncovers the one
below instead of leaving a hole: `previewUrl` (iframe) → `showcaseImage` → generated mock.

- **The stretch is a layout change made of animatable properties, not a measured FLIP.**
  The copy column collapses along whichever axis the breakpoint stacks on: its one-row grid
  goes `1fr` → `0fr` below `lg` (tweenable where `height: auto` is not), its *width* goes
  `35vw` → 0 at `lg` and up. The frame's wrapper is `flex-1`, so it absorbs the freed space
  on the same curve with nothing to keep in sync, and nothing is measured.
- **Two things made that transition read as a glitch, and both are fixed by construction.**
  They are worth knowing because either one comes straight back if the class lists are
  "simplified":
  - **Each collapse axis is scoped to its own breakpoint.** Running both at `lg` squeezed
    the column diagonally — clipped from the right by the width and from the bottom by the
    row at the same time. The collapsed class list therefore carries `lg:grid-rows-[1fr]`
    to hold the row open above `lg`.
  - **The text's own box never changes width.** The inner div is pinned at `35vw` and only
    the wrapper animates, so `overflow-hidden` *wipes* the copy instead of re-flowing it.
    Animating the width of the box text lives in re-wraps every line on every frame — words
    hopping between lines for the whole 700ms. Wrapper and inner are both `35vw`, the same
    unit, so they agree exactly at rest and nothing is clipped there; `%` against `vw`
    differs by the scrollbar and shaves the last glyph. This is also why there is no
    `min-w-*` floor — it would have to animate too, and 35vw at `lg` is already 22.4rem.
    Verify with a mid-transition measurement, not by eye: the inner box and a wrapped
    paragraph's height must be identical at rest, mid-collapse and collapsed.
- **The frame keeps a border on all four sides in every state**, with the side ones going
  transparent when it is edge to edge. Dropping to `border-y` changes the box by 1px a side,
  and the whole frame jumps at the end of the transition.
- **The scroll lock compensates for the scrollbar it hides** (`lib/scrollLock.ts`). Plain
  `overflow: hidden` on the body widens the content box by ~15px on Chrome/Linux and
  Windows, so the page reflows on the way in and again on the way out — and that second
  reflow is what makes leaving fullscreen read as a snap. Both immersive overlays use it.
- **`full` is a `fixed` overlay *and* a `requestFullscreen()` call, deliberately both.** The
  API is what a visitor wants, but iOS Safari has no element fullscreen and a permissions
  policy can block it, so the overlay has to stand on its own — and then the component's own
  Escape handler is what closes it.
- **Neither hero wrapper may carry a `z-*`.** A positioned element with a z-index creates a
  stacking context, which traps the fullscreen overlay's z-index below the navbar's. Paint
  order comes from DOM order instead (`PaletteAura` is first, so both wrappers sit above it).
- **A fullscreen fallback overlay hides the site header**, via `data-immersive` on `<html>`
  and one rule in `globals.css`. Real fullscreen promotes the element to the top layer where
  nothing can paint over it; the `fixed` fallback has no such protection, and z-index cannot
  settle it from inside a `sticky` ancestor. So the chrome steps aside — which is what real
  fullscreen looks like anyway. Paired with a scroll lock in the same effect.
- **Stretched to `hero`, the frame still clears the navbar** (`pt-20`). The header is fixed
  and translucent; the window's own title bar landing behind it reads as a bug.
- **The frame is navigable in every state, but the pointer has to be handed to it.** An
  always-live iframe swallows the wheel and the page stops scrolling wherever the pointer
  rests. So outside fullscreen the frame sits under a shield — a button covering it, so the
  wheel lands on the page as usual — and a click hands the pointer over; leaving the frame
  (`mouseleave`) or pressing Escape takes it back, and a chip says so for touch, where there
  is no leaving. Same contract as an embedded map. Changing size or exiting fullscreen resets
  it, so the page always scrolls again afterwards.
- **The preview renders at the frame's own size** (`adaptive` on `LivePreview`), not at a
  fixed 1440 scaled down. In this ~850px window that is 1024 logical px at 0.83 rather than
  1440 at 0.59 — the page is drawn 1.4× larger, and at or above `PREVIEW_MIN_WIDTH` the scale
  is exactly 1 and it is pixel-for-pixel native. It also fills the box exactly, so nothing is
  cropped. The homepage laptop screen uses it too (1024 at 0.84 rather than 1440 at 0.60);
  the phone frame is far below the floor either way, so for it nothing changes.
- **Below `lg` the preview switches to the site's mobile build** (`compact`), because a
  desktop page in a 340px frame is unreadable however sharply it is drawn, and the frame gets
  `min-h-[64svh]` so a portrait page is not a sliver. A site that is not responsive will look
  wrong there — that is the site's own rendering, not the frame's; `siteMobile` in the media
  registry is the escape hatch (a dedicated mobile URL).

### `SolutionVideoReveal` — the video that stretches open

`components/sections/solution/SolutionVideoReveal.tsx`, 260svh of pinned scroll on a
**textured-paper** ground: the presentation video opens as a centred 16:9 card, grows to
full-bleed, and starts playing at the moment it fills the viewport, with the copy fading in
over the second half of the growth. Set `Service.presentationVideo` (+
`presentationPoster`); until then the same choreography runs with a generated on-brand panel.

- **The growth is mapped to the section arriving, not to the pinned track.** The trigger
  runs `top bottom` → `bottom bottom`, so `pin = innerHeight / sectionHeight` is the
  progress at which the stage locks — and the growth window ends exactly there. By the time
  you are looking at the section it is already the whole viewport; the remaining ~1.6 screens
  are dwell time on a playing video. `pin` is measured every frame, not hardcoded: the
  section's height is in `svh` but `innerHeight` moves with a phone's URL bar.
- **The "réduire" button is a real override**, the one deliberate exception to the
  single-source-of-truth rule the pinned sections otherwise follow. `DeviceShowcase`'s
  trick — a click scrolls to the offset that produces the state it wants — cannot work here:
  with growth tied to arrival, every offset that shows a small card also has the stage half
  below the fold, so there is no position that frames one. `manual` therefore wins over the
  scroll until it is toggled back.
- **The ground is painted on the sticky stage, not the section.** The stage covers the
  viewport for the whole pinned range, so a section-level background is never seen — the
  same trap as the `mix-blend-screen` ground in `DeviceShowcase`. The texture is
  `PerformanceMetrics`' two layers (ink dot grid over mist washes), masked at the *top*
  because the section above is also white: while the section is arriving the stage's top edge
  *is* that boundary, so the fade lands on it. This is the third light section in a row on
  the WIFACILITY page (Steps → SubProjects → here); the texture plus a full-bleed video is
  what keeps it from reading as another flat white slab.
- **`on-dark` goes on the frame, not the section.** The frame is the dark surface now, so
  the accent overrides have to be declared there or the eyebrow inside it resolves to
  `signal-deep` and lands at ~2:1 on the footage. The frame also needs `ring-1 ring-ink/10`:
  on white, a shadow alone gives it no top edge.
- **The geometry is explicit px on width/height, not a `scale()`.** A scaled card drags its
  border radius, its chrome and its copy along with it: the corners flatten out and the text
  balloons. Interpolating the box keeps every child at its own size and lets the radius
  resolve to 0 on its own curve, which is what makes the end state read as "the page".
- **Fullscreen clears the inline geometry on the way in** (and `paint` short-circuits while
  it is up), because inline px beat the UA's `:fullscreen` sizing and would otherwise leave
  a scroll-sized card floating on a black screen. Exiting repaints from the last progress.
- Playback is gated on **in view *and* stretched**; the play button is a tri-state override
  (`override ?? stretched`). Muted to satisfy autoplay policy, with an unmute control.
- The copy's bottom padding is `pb-[22%] md:pb-[14%]` — a single percentage puts the
  tagline's last line behind the control row on a phone, where the frame is tall and narrow.
- Reduced motion drops the pinning and renders the settled full-bleed state; the stretch
  button disappears with it, because there is no longer a scroll position to jump to.

### Real assets in the gallery — `MediaSlot.src`

Any `MediaSlot` descriptor takes an optional `src` (and `poster` for a `video-slot`). The
generated mock is **always rendered** and the asset is layered over it, so filling a slot in
is a one-line change in `lib/data/services.ts`:

- a **local path** goes through `next/image`; an **absolute URL** is served `unoptimized`,
  which is what lets a link be pasted in without adding the host to `images.remotePatterns`
  in next.config.ts (the optimizer validates remote hosts, serving as-is skips that route);
- `LoadingImage` covers the decode with an opaque `skeleton-sweep` panel, then cross-fades
  the photo in. The panel is `bg-abyss`, not `bg-ink`: most of these slots sit *on* ink, and
  a same-value panel reads as an empty card rather than as something loading;
- on `error` it renders **nothing**, which uncovers the mock. A dead link degrades to the
  placeholder instead of an alt-text box.

`SolutionMedia`'s "these are provisional" line is keyed on whether every slot is still a
mock, so it stops claiming that as soon as real assets land.

## Known environment quirk

In headless/automated browser sessions the tab reports `document.hidden === true`, which
throttles `requestAnimationFrame` — the WebGL canvas renders blank and GSAP tweens stall until
a real interaction (click/drag) nudges the loop. This is a tooling artifact, not a bug; real
users on a focused tab never hit it.

**There is a clean way around it over CDP**, which is what makes scroll-scrubbed sections
verifiable without a real browser. Chrome is at `/usr/bin/google-chrome`, and Node 22 has a
built-in `WebSocket`, so a ~80-line script needs no dependencies: spawn with
`--headless=new --remote-debugging-port`, connect to the **browser** endpoint
(`/json/version`, not `/json/list`), `Target.attachToTarget` with `flatten: true`, then
`Runtime.evaluate` / `Page.captureScreenshot` on that session. Launch with
`--autoplay-policy=no-user-gesture-required` if the page has video.

**`Emulation.setPageVisibilityOverride` is gone** — it answers `-32601 wasn't found` on
Chrome 151, which is what is installed here. What works instead is
`Emulation.setFocusEmulationEnabled {enabled: true}` plus `Target.activateTarget`, after
which `document.hidden` is `false` and rAF ticks; verify with a two-frame rAF race against a
timeout before trusting a screenshot of a scrubbed section.

One trap when driving a pinned section: **don't precompute scroll offsets from one early
measurement.** Content above settles after load, so a `sectionTop + p * track` computed at
t=0 lands at a different progress by the time you scroll there — an early run of this
sampled p=0.45 while believing it was at p=0.30. Re-read the section's live
`getBoundingClientRect()` and correct in a loop until `-rect.top / (height - innerHeight)`
matches the progress you wanted.

## Open items

- All copy is a first-draft placeholder.
- No real media yet beyond `public/photos/service1.jpg` (OCR's laptop mockup) and the
  homepage reveal video. Every slot is plumbed and documented in `lib/data/media.ts` —
  filling them in is data, not code.
- `site` is set for SETYCORE only (`wi-univers-release.admin.setycorp.net`, which sends no
  framing headers, so it embeds). Note its login page is **not responsive** — it overflows
  horizontally in a real 390px browser too — so the mobile preview of it looks clipped. The
  other three solutions fall through to their generated mocks.
- Only 4 solutions modeled; the registry is built to extend.
