import type { CSSProperties } from "react";
import type { IconName } from "@/lib/types";

const PATHS: Record<IconName, string> = {
  scan: "M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3M4 12h16",
  layers: "M12 3 2 8l10 5 10-5-10-5ZM2 16l10 5 10-5M2 12l10 5 10-5",
  globe: "M12 3a9 9 0 1 0 .001 18.001A9 9 0 0 0 12 3ZM3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z",
  shield: "M12 3l8 3v6c0 5-3.4 8.4-8 9-4.6-.6-8-4-8-9V6l8-3Z",
  zap: "M13 2 4 14h6l-1 8 9-12h-6l1-8Z",
  link: "M9 15l6-6M8 7l1.5-1.5a4 4 0 1 1 5.7 5.7L14 12M16 17l-1.5 1.5a4 4 0 1 1-5.7-5.7L10 12",
  "bar-chart": "M4 20V10M12 20V4M20 20v-7",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 3",
  "credit-card": "M3 6h18v12H3zM3 10h18M7 15h4",
  store: "M4 9V6l2-3h12l2 3v3M4 9h16M4 9v9h16V9M9 21v-6h6v6",
  server: "M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01",
  lock: "M6 11V8a6 6 0 1 1 12 0v3M5 11h14v10H5z",
  check: "M4 12l6 6L20 6",
  users: "M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2 21c0-3.3 2.7-6 6-6s6 2.7 6 6M17 11a3 3 0 1 0 0-6M15 15c2.8.4 5 2.8 5 6",
  cloud: "M7 18a4.5 4.5 0 0 1-1-8.9A5.5 5.5 0 0 1 17 9a4 4 0 0 1 0 8H7Z",
  sparkles: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3ZM5 17l.7 2.1L8 20l-2.3.9L5 23l-.7-2.1L2 20l2.3-.9L5 17ZM19 15l.6 1.8L21.5 17l-1.9.7L19 19.5l-.6-1.8L16.5 17l1.9-.7L19 15Z",
  refresh: "M4 4v5h5M20 20v-5h-5M4.6 15A8 8 0 0 0 19 9M19.4 9A8 8 0 0 0 5 15",
  database: "M12 5c4.4 0 8-1.3 8-3s-3.6-3-8-3-8 1.3-8 3 3.6 3 8 3ZM4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6",
  move: "M12 3v18M3 12h18M12 3 9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5",
  // Corner brackets pointing outward / inward — the browser-frame and video controls.
  maximize: "M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5",
  minimize: "M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5",
  external: "M14 4h6v6M20 4l-8 8M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5",
  "arrow-right": "M5 12h14M13 6l6 6-6 6",

  /* Dashboard chrome. Same 24×24 grid, same 1.6 stroke, no fills — so they sit
     next to the marketing set without looking borrowed from another icon pack. */
  bell: "M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M13.7 20a2 2 0 0 1-3.4 0",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 14.5a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1Z",
  "log-out": "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3",
  "file-text": "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5M9 13h6M9 17h6",
  inbox: "M3 12h5l2 3h4l2-3h5M5 5h14l2 7v7H3v-7l2-7Z",
  "chevron-down": "M6 9l6 6 6-6",
  "chevron-right": "M9 6l6 6-6 6",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  upload: "M12 17V4M7 9l5-5 5 5M4 20h16",
  download: "M12 4v13M7 12l5 5 5-5M4 20h16",
  home: "M4 11l8-7 8 7M6 10v10h12V10",
  receipt: "M5 3v18l2.5-1.5L10 21l2-1.5L14 21l2.5-1.5L19 21V3H5ZM9 8h6M9 12h6M9 16h3",
  activity: "M3 12h4l3 8 4-16 3 8h4",
  ban: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6l12.8 12.8",
  send: "M21 3 3 10.5l7 3 3 7L21 3Z",
  /* Light/dark toggle, lucide's own geometry (ISC) redrawn on this file's 24x24
     grid: `sun` is lucide's `sun`, `moon` its `moon`. Both are stroke-only like
     every other entry, so the pair sits inside a nav row without looking borrowed. */
  sun: "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42",
  moon: "M20.98 12.79A9 9 0 1 1 11.21 3.02a7 7 0 0 0 9.77 9.77Z",
};

export function Icon({
  name,
  className = "h-6 w-6",
  strokeWidth = 1.6,
  style,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
