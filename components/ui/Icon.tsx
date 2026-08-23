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
  "arrow-right": "M5 12h14M13 6l6 6-6 6",
};

export function Icon({
  name,
  className = "h-6 w-6",
  strokeWidth = 1.6,
}: {
  name: IconName;
  className?: string;
  strokeWidth?: number;
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
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
