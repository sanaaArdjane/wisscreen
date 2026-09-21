"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Spinner } from "@heroui/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

export type FilterDef = {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
};

/**
 * Search + dropdown filters for the admin list pages.
 *
 * State lives in the **URL**, not in React: a filtered queue is something the
 * desk shares, bookmarks and reloads, and the list itself is a server component
 * that reads `searchParams`. So each control rewrites the query string and lets
 * the server re-render.
 *
 * The search box is debounced by 300 ms and wrapped in `useTransition`, so
 * typing doesn't fire a navigation per keystroke and the old list stays on
 * screen (dimmed) while the new one loads instead of flashing empty.
 */
export function FilterBar({
  basePath,
  filters,
  searchPlaceholder = "Rechercher…",
}: {
  basePath: string;
  filters: FilterDef[];
  searchPlaceholder?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(params.get("q") ?? "");

  function push(next: URLSearchParams) {
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${basePath}?${qs}` : basePath));
  }

  useEffect(() => {
    const current = params.get("q") ?? "";
    if (query === current) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (query) next.set("q", query);
      else next.delete("q");
      push(next);
    }, 300);
    return () => clearTimeout(timer);
    // `params` deliberately excluded: including it re-arms the timer on every
    // navigation this effect itself causes, which loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-center gap-3 transition-opacity",
        pending && "opacity-60",
      )}
    >
      <label className="relative flex min-w-[15rem] flex-1 items-center">
        <span className="sr-only">{searchPlaceholder}</span>
        <Icon
          name="search"
          className="pointer-events-none absolute left-4 size-4 text-fg/80"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-full bg-soft py-3 pl-11 pr-4 text-sm font-[450] text-fg placeholder:text-fg/80 focus:outline-none focus:ring-2 focus:ring-fg"
        />
      </label>

      {filters.map((filter) => (
        <label key={filter.name} className="flex items-center gap-2 text-sm">
          <span className="font-[450] text-fg/80">{filter.label}</span>
          {/* A native <select>: it is one control, it is keyboard-accessible for
              free, and on a phone it opens the platform picker — which beats a
              custom listbox for a filter nobody spends time in. */}
          <select
            value={filter.value}
            onChange={(e) => {
              const next = new URLSearchParams(params.toString());
              const fallback = filter.options[0]?.value;
              if (e.target.value === fallback) next.delete(filter.name);
              else next.set(filter.name, e.target.value);
              push(next);
            }}
            className="rounded-full bg-soft py-3 pl-4 pr-9 text-sm font-[650] text-fg focus:outline-none focus:ring-2 focus:ring-fg"
          >
            {filter.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      {pending && <Spinner className="size-4 text-fg/80" />}
    </div>
  );
}
