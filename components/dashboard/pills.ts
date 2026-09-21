/**
 * The spec's three button pills, as class strings for the places that need a
 * plain `<Link>` or `<button>` rather than HeroUI's `Button` (whose own variants
 * are themed to the same three looks in `app/(app)/heroui.css`).
 *
 * This is a plain module, NOT part of `ui.tsx`: that file is `"use client"`, and a
 * non-component export (a string) imported from a client module into a server
 * component arrives as a client reference, not the value. Every dashboard page
 * that renders a pill is a server component.
 *
 * `pillPrimary` is ink with a paper label — 9.3:1 — and deepens to `abyss` on
 * hover. It replaces `control-signal`: the green is the accent role now and is
 * never a CTA. Sizing is part of the string so a call site can't drift from it.
 */
const PILL =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-[650] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg";
export const pillPrimary = `${PILL} bg-fg text-on-fg hover:bg-fg-hover`;
export const pillOutline = `${PILL} border border-fg/15 bg-panel text-fg hover:bg-soft`;
export const pillSoft = `${PILL} bg-soft text-fg hover:bg-fg/8`;
/** Panel-header action ("Tout voir"): the soft pill at header scale. */
export const pillSmall =
  "inline-flex items-center gap-1.5 rounded-full bg-soft px-3.5 py-1.5 text-xs font-[650] text-fg transition-colors hover:bg-fg/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg";
