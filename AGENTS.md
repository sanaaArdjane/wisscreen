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

That last step is not cosmetic. `ember` clears 4.5:1 on white at exactly 4.55:1, so it has
essentially no headroom: a 5% dark tint under the eyebrow drops it to ~3.6:1 and an 8% one
to ~3.4:1. The same tint fails `mist` outright (`ember` on `mist` is 4.04:1), which is why
the ground here is `paper` and not the slightly cooler token. Anything you add behind the
copy has to be pure `#fff` by the time the copy is visible, or the eyebrow has to stop
being ember.

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

Things worth preserving:

- **`layerAlpha` only ever fades a layer *in*.** Screens stack with later ones on top and
  every layer below the current one stays fully opaque, so the stack is never see-through.
  A symmetric tent — fading each layer in *and* out — puts two half-transparent screens on
  screen at the crossover with the section's own background showing between them.
- **The stage is height-critical.** Heading, devices, copy and tabs all have to fit one
  viewport, and the devices are the only elastic part, so their width is capped by the
  height left over: `max-w-[min(40rem,calc((100svh-21rem)*1.45))]`. `min()` lets whichever
  of width or height is scarcer win — height on a short desktop, width on a phone. The
  `21rem` is the measured cost of everything else; if you add a line anywhere in the stage,
  raise it or the tabs go past the fold on a 760px-tall window.
- **`on-dark` on the section is required, not decorative.** The ground is an arbitrary
  value (`#0f1520`), so none of the `.bg-ink` / `.bg-abyss` selectors that carry the
  dark-ground accent overrides match, and `.text-warm` / `.text-accent` would resolve to
  their light-ground values on a near-black section.
- **The tab row scrolls horizontally rather than wrapping.** A second row of tabs would
  change the stage height mid-scroll.
- **`pt-16` on the sticky stage clears the fixed navbar.** The stage centres its content in
  the viewport, so without it the ember eyebrow sits under the glass bar.
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
four: hero, story/stats, features, steps, sub-projects (Etaysir), media gallery + demo CTA,
FAQ, contact, related solutions.

## Known environment quirk

In headless/automated browser sessions the tab reports `document.hidden === true`, which
throttles `requestAnimationFrame` — the WebGL canvas renders blank and GSAP tweens stall until
a real interaction (click/drag) nudges the loop. This is a tooling artifact, not a bug; real
users on a focused tab never hit it.

**There is a clean way around it over CDP**, which is what makes scroll-scrubbed sections
verifiable without a real browser: `Emulation.setPageVisibilityOverride {visible: true}`
un-throttles rAF, so GSAP tickers and ScrollTrigger run normally and screenshots show the
real frame. Chrome is at `/usr/bin/google-chrome`, and Node 22 has a built-in `WebSocket`,
so a ~60-line script (spawn with `--headless=new --remote-debugging-port`, `Target.attachToTarget`
with `flatten: true`, then `Runtime.evaluate` / `Page.captureScreenshot`) needs no
dependencies. Launch with `--autoplay-policy=no-user-gesture-required` if the page has video.

One trap when driving a pinned section: **don't precompute scroll offsets from one early
measurement.** Content above settles after load, so a `sectionTop + p * track` computed at
t=0 lands at a different progress by the time you scroll there — an early run of this
sampled p=0.45 while believing it was at p=0.30. Re-read the section's live
`getBoundingClientRect()` and correct in a loop until `-rect.top / (height - innerHeight)`
matches the progress you wanted.

## Open items

- All copy is a first-draft placeholder.
- No real media yet; placeholder descriptors and no `previewGif` values.
- Only 4 solutions modeled; the registry is built to extend.
