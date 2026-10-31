---
version: 1.0
name: SETYCORP Daylight
description: SETYCORP's light-only design language. Structure borrowed from the Mercury analysis (one confident action pill, soft tinted secondary pills, fill-separated rounded cards, light type weights, gallery pacing); palette from the existing site plus the owner's teal and mint washes. No dark surfaces anywhere — the night world of the reference is dropped entirely.

colors:
  # Action
  primary: "#1099A5"          # brand teal — fills, icons, focus, large type (≥24px)
  primary-strong: "#0A7681"   # filled CTA (white label 5.36:1)
  primary-text: "#0E6F78"     # small accent text, links, eyebrows (≥4.8:1 on every ground below)
  on-primary: "#FFFFFF"
  # Grounds (light only)
  canvas: "#FFFFFF"
  wash: "#E7F5F6"             # aqua wash — tinted sections, cards on white
  mint-wash: "#E7F4EC"        # second tinted section, alternate cards
  mint: "#C7F2E0"             # chips, highlights, hover fills, the stat glow
  # Text
  ink: "#354666"              # headlines and body (9.5:1 on canvas, 7.8:1 on mint)
  ink-secondary: "#366479"    # descriptions, captions (6.5:1 canvas, 5.3:1 mint)
  # Identity (from the existing site) — fills and borders only, never small text
  teal: "#379F9E"
  aqua: "#7FC9C8"
  steel-pale: "#9FBDD0"
  # Functional, dashboard only
  danger: "#B42318"

typography:
  display:   { fontFamily: Geist, fontSize: 64px, fontWeight: 500, lineHeight: 1.05, letterSpacing: -0.02em }
  heading-1: { fontFamily: Geist, fontSize: 48px, fontWeight: 500, lineHeight: 1.1,  letterSpacing: -0.02em }
  heading-2: { fontFamily: Geist, fontSize: 28px, fontWeight: 500, lineHeight: 1.2,  letterSpacing: -0.01em }
  stat:      { fontFamily: Geist, fontSize: 60px, fontWeight: 500, lineHeight: 1.1 }
  lead:      { fontFamily: Geist, fontSize: 22px, fontWeight: 400, lineHeight: 1.4 }
  body-lg:   { fontFamily: Geist, fontSize: 18px, fontWeight: 400, lineHeight: 1.6 }
  body:      { fontFamily: Geist, fontSize: 16px, fontWeight: 400, lineHeight: 1.6 }
  ui:        { fontFamily: Geist, fontSize: 15px, fontWeight: 500, lineHeight: 1 }
  eyebrow:   { fontFamily: Geist, fontSize: 13px, fontWeight: 500, lineHeight: 1, letterSpacing: 0.08em, textTransform: uppercase }
  legal:     { fontFamily: Geist, fontSize: 12px, fontWeight: 400, lineHeight: 1.5 }

rounded:
  sm: 8px        # images, small controls
  md: 16px       # cards
  lg: 24px       # large panels, media frames
  pill: 9999px   # every button, chip and input

spacing:
  base: 8px
  card-padding: 32px      # 40px from md
  gap: 24px               # card grids; 32px from lg
  heading-to-content: 64px
  section: 128px          # mobile 96px; 160px from lg
  container: 1200px       # headlines capped at ~720px

components:
  nav-bar:          { backgroundColor: "{colors.canvas} at 85% + blur", textColor: "{colors.ink}", height: 72px, border: "1px {colors.ink} at 8% once scrolled" }
  button-primary:   { backgroundColor: "{colors.primary-strong}", hover: "{colors.primary-text}", textColor: "{colors.on-primary}", rounded: "{rounded.pill}", height: 44px, padding: "0 24px" }
  button-tint:      { backgroundColor: "{colors.primary} at 10%", hover: "15%", textColor: "{colors.ink}", rounded: "{rounded.pill}", height: 44px }
  button-outline:   { backgroundColor: transparent, border: "1px {colors.ink} at 15%", textColor: "{colors.ink}", rounded: "{rounded.pill}" }
  eyebrow-badge:    { backgroundColor: "{colors.canvas}", border: "1px {colors.primary-text} at 30%", textColor: "{colors.primary-text}", typography: "{typography.eyebrow}", rounded: "{rounded.pill}" }
  feature-card:     { backgroundColor: "{colors.wash} on canvas · {colors.canvas} on a tinted section", textColor: "{colors.ink}", rounded: "{rounded.md}", padding: "{spacing.card-padding}", border: none, shadow: none }
  stat-tile:        { backgroundColor: "{colors.canvas}", numeral: "{typography.stat} in {colors.ink}", accentTile: "{colors.mint} fill, {colors.primary} numeral only at ≥24px" }
  chip:             { backgroundColor: "{colors.mint}", border: "1px {colors.primary} at 25%", textColor: "{colors.ink}", rounded: "{rounded.pill}" }
  site-footer:      { backgroundColor: "{colors.wash}", textColor: "{colors.ink}", columnHeads: "{colors.ink}", links: "{colors.ink-secondary}" }
---

## Overview

SETYCORP reads as a calm, daylight cloud company: white canvas, pale aqua and mint washes,
deep slate-ink text, and **one** teal action. Everything the Mercury reference did in its
night world — dark nav, dark hero, glowing cards, dark footer — is translated into the day
world. There is no dark surface anywhere on the public site. Ink exists only as text and
hairlines.

Hierarchy comes from **space, size and fill**, not from weight, borders or shadow. Sections
breathe (128–160px apart), headlines are centred or narrow, cards are separated from the
ground by a single tonal step.

**Key characteristics**
- One saturated action colour: `primary-strong` on a pill. Everything else that is
  clickable is a 10% teal tint or a hairline outline.
- Three grounds only — `canvas`, `wash`, `mint-wash` — and `mint` for small highlights.
- Light-ish type: Geist 500 for headlines (never 600/700), 400 for text.
- Cards: 16px corners, 32–40px padding, no border, no shadow.
- Generous whitespace is the design. When in doubt, add vertical space, not decoration.

## Colors

### Why three teals
`#1099A5` is the brand value, but it is a mid-tone: white on it is 3.43:1 and it sits at
3.0–3.4:1 on the washes. So it is used where 3:1 suffices — fills, icons, focus rings, the
hand-drawn underline, numerals and display type ≥24px. Two shades carry the jobs that need
4.5:1:

| hex | role | on canvas | on wash | on mint-wash | on mint |
| --- | --- | --- | --- | --- | --- |
| `#1099A5` primary | fills, icons, ≥24px type | 3.43 | 3.07 | 3.03 | 2.81 ✗ |
| `#0A7681` primary-strong | CTA fill (white label 5.36) | 5.36 | 4.79 | 4.73 | 4.39 |
| `#0E6F78` primary-text | small accent text | 5.89 | 5.27 | 5.21 | 4.83 |
| `#354666` ink | text | 9.46 | 8.47 | 8.36 | 7.75 |
| `#366479` ink-secondary | secondary text | 6.45 | 5.77 | 5.70 | 5.28 |

Never put `primary` type on `mint` (2.81:1).

### Grounds
- **Canvas `#FFFFFF`** — the default. Most sections are white.
- **Wash `#E7F5F6`** — every other content section, the footer, and cards on white.
- **Mint-wash `#E7F4EC`** — a second tint used sparingly (one or two sections per page) so
  the rhythm is not a strict two-beat.
- **Mint `#C7F2E0`** — chips, the active/hover state of tint controls, the accent stat tile.
  It is a highlight, not a ground for whole sections.

The old dark tokens (`abyss`, ink or steel as a surface, `#0f1520`, the `on-dark` overrides)
are retired. `ink` and `steel` survive as text colours only.

## Typography
Geist, already loaded. Headlines `font-medium` (500) with −0.02em tracking; body 400 at
1.6 line-height; eyebrows 13px uppercase 500 with 0.08em tracking. Two text alphas only:
`text-ink` and `text-ink/80` — not `opacity-70`, which drops ink under 4.5:1 on the washes.

## Layout & whitespace
- Section padding: `py-24 md:py-32 lg:py-40`.
- Heading block → content: 64px (`mt-16`).
- Card grids: `gap-6 lg:gap-8`; card padding `p-8 md:p-10`.
- Container 1200px; headline measure ≤ 720px; body measure ≤ 640px.
- Prefer centred section headings on marketing sections; left-aligned in split layouts.

## Texture and depth (no gradients)
- **No colour gradients.** Grounds are flat. The only gradients allowed are legibility scrims
  under text laid over a photo or video, and masks that fade a texture's lines.
- **Every section has a texture**: `section-paper` / `section-tint` / `section-mint` paint a
  flat ground under a 1px ink dot grid (24px pitch, 11% alpha). The hero and auth pages use
  the fine 1px-in-4px weave.
- **Big sections get 3D**: `texture-3d` adds a perspective grid floor in teal at ~20% alpha
  receding behind the content; `texture-3d-room` adds a mirrored ceiling for the tallest
  sections (the solutions grid, the device showcase).

## Elevation
Flat. A card is separated by fill alone. The only shadow allowed is a hair-soft
`0 1px 2px rgba(53,70,102,.04), 0 8px 24px rgba(53,70,102,.06)` under floating media
(device frames, product mockups) on white.

## Components
- **Navbar** — white glass (`bg-paper/85` + blur), ink links, and a single CTA pill:
  "Nous contacter". Gains a hairline bottom border when scrolled.
- **Logo** — live-text wordmark: "Sety" in ink, "corp" white on a slanted `primary-strong`
  flag.
- **Buttons** — `primary` (filled pill), `secondary` (teal 10% tint), `ghost` (hairline).
  Never two filled pills side by side.
- **Eyebrow** — `Badge` with `text-signal border-signal/40` (resolves to primary-text).
- **Cards** — `bg-mist` on white sections, `bg-paper` on tinted sections, `rounded-2xl`,
  no border.
- **Stat tiles** — white or wash tile, ink numerals; the middle tile alone takes `mint`
  with a `primary` numeral (large type, so 3:1 applies — on mint use `primary-text`).
- **Footer** — `wash` ground, ink headings, `ink-secondary` links.

## Do / Don't
- Do let space separate things before reaching for a border.
- Do keep one filled CTA per view.
- Don't introduce dark backgrounds, dark glass or dark overlays — including in media
  placeholders and the 3D scene.
- Don't use `primary` (#1099A5) for text under 24px.
- Don't add new hues. Status colours stay in the dashboard.
