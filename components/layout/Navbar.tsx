"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/layout/Logo";
import type { NavContent } from "@/lib/content/schema";

/**
 * The menu comes from `/admin/site/navigation` (the `nav` block), so an entry is plain
 * data: a label, a link, and optionally a dropdown of children.
 */
export function Navbar({ items, brand }: { items: NavContent["items"]; brand: string }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // Index of the dropdown showing on desktop. One at a time; hover and keyboard focus both open it.
  const [menu, setMenu] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Same chrome as the back-office (`components/dashboard/AppShell.tsx`): a floating
  // rounded pill inset from the edges, which on scroll snaps to a full-width bar with a
  // bottom border. Both states are the same element, so it transitions rather than swaps
  // — and both carry a `ring` *and* a `border-b` (one of them transparent) so the box
  // never changes size by a pixel at the end of the transition. White glass in both
  // states: every page opens on a light ground.
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[padding] duration-300 ease-out",
        scrolled ? "px-0 pt-0" : "px-4 pt-4 sm:px-6 lg:px-8",
      )}
    >
      <nav
        className={cn(
          "mx-auto flex w-full items-center justify-between backdrop-blur-md",
          "transition-[max-width,border-radius,padding,background-color] duration-300 ease-out",
          "text-ink",
          scrolled
            ? cn(
                // a length, not `max-w-none`: `none` is a discrete value, so the width would
                // snap while the padding and radius animate.
                "max-w-[160rem] rounded-none border-b border-ink/10 bg-paper/85 px-6 py-3 ring-1 ring-transparent md:px-10",
              )
            : "max-w-[1280px] rounded-full border-b border-transparent bg-paper/85 px-5 py-2.5 ring-1 ring-ink/10 md:px-6",
        )}
      >
        <Link href="/" aria-label={brand}>
          <Logo name={brand} />
        </Link>

        <ul className="hidden items-center gap-6 text-sm font-medium md:flex lg:gap-8">
          {items.map((item, i) => (
            <li
              key={`${item.label}-${i}`}
              className="relative"
              onMouseEnter={() => item.children.length > 0 && setMenu(i)}
              onMouseLeave={() => setMenu((m) => (m === i ? null : m))}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) setMenu((m) => (m === i ? null : m));
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setMenu(null);
              }}
            >
              {item.children.length === 0 ? (
                <Link href={item.href} className="text-ink/80 transition-colors hover:text-ink">
                  {item.label}
                </Link>
              ) : (
                <>
                  <span className="flex items-center gap-1">
                    <Link href={item.href} className="text-ink/80 transition-colors hover:text-ink">
                      {item.label}
                    </Link>
                    <button
                      type="button"
                      aria-label={`Sous-menu ${item.label}`}
                      aria-haspopup="true"
                      aria-expanded={menu === i}
                      onClick={() => setMenu((m) => (m === i ? null : i))}
                      className="rounded-full p-1 opacity-80 transition-opacity hover:opacity-100"
                    >
                      <Icon
                        name="chevron-down"
                        className={cn("size-3.5 transition-transform", menu === i && "rotate-180")}
                      />
                    </button>
                  </span>
                  {menu === i && (
                    // `pt-3` is a hover bridge: the gap between the label and the panel
                    // belongs to the <li>, so the pointer never leaves it on the way down.
                    <div className="absolute left-1/2 top-full z-10 -translate-x-1/2 pt-3">
                      <ul className="min-w-48 rounded-2xl bg-paper p-2 text-ink shadow-[0_1px_2px_rgba(53,70,102,.04),0_8px_24px_rgba(53,70,102,.06)] ring-1 ring-ink/10">
                        {item.children.map((child, j) => (
                          <li key={`${child.label}-${j}`}>
                            <Link
                              href={child.href}
                              onClick={() => setMenu(null)}
                              className="block whitespace-nowrap rounded-xl px-3.5 py-2 text-sm hover:bg-mist"
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </li>
          ))}
          {/* The blog's only sitewide link. An index reachable from one footer column
              is an index a crawler reaches last and a visitor never. */}
          <li>
            <Link href="/blog" className="relative text-ink/80 transition-colors hover:text-ink">
              Blog
            </Link>
          </li>
        </ul>

        {/* One call to action. The sign-in and sign-up links are off the public bar for
            now (owner's call); /connexion and /inscription still work by URL. `/contact`
            rather than `#contact` because blog and legal pages have no contact section. */}
        <div className="hidden items-center md:flex">
          <Link
            href="/contact"
            className="control-signal rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Nous contacter
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
          aria-expanded={open}
          aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        >
          <span className={cn("h-px w-6 bg-current transition-transform", open && "translate-y-[3.5px] rotate-45")} />
          <span className={cn("h-px w-6 bg-current transition-transform", open && "-translate-y-[3.5px] -rotate-45")} />
        </button>
      </nav>

      {/* The sheet matches the bar's ground and inset so the two read as one piece of chrome. */}
      {open && (
        <div
          className={cn(
            "mt-2 rounded-3xl p-6 backdrop-blur-md md:hidden",
            scrolled ? "mx-4 sm:mx-6" : "mx-0",
            "bg-paper/95 text-ink ring-1 ring-ink/10",
          )}
        >
          <ul className="flex flex-col gap-4 text-base font-medium">
            {items.map((item, i) => (
              <li key={`${item.label}-${i}`}>
                <Link href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
                {item.children.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-2 border-l border-ink/10 pl-4 text-sm">
                    {item.children.map((child, j) => (
                      <li key={`${child.label}-${j}`}>
                        <Link href={child.href} onClick={() => setOpen(false)} className="text-ink/80">
                          {child.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            <li>
              <Link href="/blog" onClick={() => setOpen(false)}>
                Blog
              </Link>
            </li>
          </ul>

          <div className="mt-5 flex flex-col border-t border-ink/10 pt-5">
            <Link
              href="/contact"
              onClick={() => setOpen(false)}
              className="control-signal rounded-full px-5 py-2.5 text-center text-sm font-medium"
            >
              Nous contacter
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
