/**
 * The dashboard's colour scheme preference.
 *
 * Kept in a cookie rather than localStorage so the server can render
 * `data-theme` on the very first byte — no flash of the wrong theme, and no
 * inline script racing hydration. `system` (the default, and what an absent
 * cookie means) renders no attribute at all and lets `color-scheme: light dark`
 * follow the OS; see the theming block in `app/(app)/heroui.css`.
 *
 * This file is imported by client code, so it must not touch `next/headers`.
 * The server-side read lives in `lib/theme-server.ts`.
 *
 * Switching is a plain state change — no View Transitions, no reveal. There was
 * a `clip-path` sweep here once; it is gone on purpose. Don't add one back
 * without being asked.
 */

export const THEME_COOKIE = "wc-theme";
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export function parseTheme(value: string | undefined): Theme {
  return (THEMES as readonly string[]).includes(value ?? "") ? (value as Theme) : "system";
}

/**
 * Whether a stored preference resolves to dark *right now* — `system` follows the
 * OS. Browser-only: it reads `matchMedia`, so never call it during a server render.
 */
export function isDarkTheme(theme: Theme): boolean {
  return theme === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : theme === "dark";
}
