/**
 * Dates, rendered the same way everywhere.
 *
 * Every formatter is explicitly `fr-FR` + `Europe/Paris` rather than the
 * runtime's locale: the server renders these, so "the browser's timezone" is
 * never what gets used, and a container running in UTC would otherwise show a
 * different day than the person reading it. Fixing the zone also keeps the
 * server and client markup identical, which is what stops React's hydration
 * mismatch warning on any timestamp.
 */
const TZ = "Europe/Paris";

const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: TZ,
});

const DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TZ,
});

/** `yyyy-MM-dd`, for `<input type="date">` which accepts nothing else. */
const ISO_DATE = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TZ,
});

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return DATE.format(new Date(value));
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return DATE_TIME.format(new Date(value));
}

export function toDateInput(value: Date | string | null | undefined): string {
  if (!value) return "";
  return ISO_DATE.format(new Date(value));
}

/** "il y a 3 jours". Uses the largest unit that still reads as a whole number. */
export function relativeTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const then = new Date(value).getTime();
  const seconds = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(Math.round(seconds), "second");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const units = ["Ko", "Mo", "Go"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}

/**
 * A date `days` in the past. Lives here rather than inline in a component:
 * `Date.now()` during render is impure, and React's lint rule rejects it.
 */
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}
