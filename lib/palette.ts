import type { PaletteToken } from "@/lib/types";

export const paletteBg: Record<PaletteToken, string> = {
  teal: "bg-teal",
  aqua: "bg-aqua",
  steel: "bg-steel",
};

/**
 * Accent text for a solution's palette token. These are ground-adaptive classes, not
 * plain colour utilities: the raw brand hexes are mid-tones that fail AA for small
 * text on white *or* on the dark surfaces, so the value is resolved from CSS vars set
 * by the nearest dark ground (`.section-ink`, `.bg-ink`, `.on-dark`, ...). See the
 * `--pt-*` block in app/globals.css. Use `paletteBg` / `paletteBorder` for fills and
 * borders — those keep the exact brand hex.
 */
export const paletteText: Record<PaletteToken, string> = {
  teal: "pt-teal",
  aqua: "pt-aqua",
  steel: "pt-steel",
};

export const paletteBorder: Record<PaletteToken, string> = {
  teal: "border-teal",
  aqua: "border-aqua",
  steel: "border-steel",
};
