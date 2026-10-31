"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/layout/Logo";
import type { NavContent } from "@/lib/content/schema";

/**
 * The menu comes from `/admin/site/navigation` (the `nav` block), so an entry is plain
 * data: a label, a link, and optionally a dropdown of children.
 */
export function Navbar({ items, brand, logo }: { items: NavContent["items"]; brand: string; logo: { src: string; light: string } }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // Index of the dropdown showing on desktop. One at a time; hover and keyboard focus both open it.
  const [menu, setMenu] = useState<number | null>(null);

  // Which colour family the bar wears. It follows the page's opening ground, not the
  // scroll: the homepage hero is light, every other page opens on `section-ink`. Scroll
  // only changes the bar's shape.
  // ponytail: pathname test, not a prop — the layout is async and this is the only light
  // hero on the site. A second one means plumbing the ground down from the page.
  const pathname = usePathname();
  const dark = pathname !== "/";

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
  // never changes size by a pixel at the end of the transition.
  //
  // The colour family follows the page's opening ground rather than the scroll: the
  // homepage hero is light, every other page opens on `section-ink`. The old bar was
  // `glass-panel` (ink at 55%) in its scrolled state whatever was behind it, which over a
  // light section composited to rgb(134,146,166) — `text-paper` on that is 3.15:1.
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
          dark ? "on-dark text-paper" : "text-ink",
          scrolled
            ? cn(
                // a length, not `max-w-none`: `none` is a discrete value, so the width would
                // snap while the padding and radius animate.
                "max-w-[160rem] rounded-none px-6 py-3 ring-1 ring-transparent md:px-10",
                dark ? "border-b border-white/10 bg-ink/85" : "border-b border-ink/10 bg-paper/85",
              )
            : cn(
                "max-w-[1280px] rounded-full border-b border-transparent px-5 py-2.5 md:px-6",
                dark ? "bg-ink/55 ring-1 ring-white/12" : "bg-paper/75 ring-1 ring-ink/10",
              ),
        )}
      >
        <Link href="/" aria-label={brand}>
          <Logo logo={logo} name={brand} onDark={dark} />
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
                <Link href={item.href} className="opacity-80 transition-opacity hover:opacity-100">
                  {item.label}
                </Link>
              ) : (
                <>
                  <span className="flex items-center gap-1">
                    <Link href={item.href} className="opacity-80 transition-opacity hover:opacity-100">
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
                      <ul
                        className={cn(
                          "min-w-48 rounded-2xl p-2 shadow-lg ring-1",
                          dark ? "on-dark bg-ink text-paper ring-white/12" : "bg-paper text-ink ring-ink/10",
                        )}
                      >
                        {item.children.map((child, j) => (
                          <li key={`${child.label}-${j}`}>
                            <Link
                              href={child.href}
                              onClick={() => setMenu(null)}
                              className={cn(
                                "block whitespace-nowrap rounded-xl px-3.5 py-2 text-sm",
                                dark ? "hover:bg-white/10" : "hover:bg-mist",
                              )}
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
            <Link href="/blog" className="relative opacity-80 transition-opacity hover:opacity-100">
              Blog
            </Link>
          </li>
        </ul>

        {/* Auth entry points, and no link to /admin anywhere: staff reach the
            back-office by typing the URL, and signing in sends them there. Both
            links are plain hrefs with no session read, so the marketing pages
            stay statically rendered — `/connexion` bounces an already-signed-in
            visitor to their dashboard, so the link is never wrong. */}
        <div className="hidden items-center gap-5 md:flex">
          <Link
            href="#contact"
            className="text-sm font-medium opacity-80 transition-opacity hover:opacity-100"
          >
            Nous contacter
          </Link>
          <Link
            href="/connexion"
            className="text-sm font-medium opacity-80 transition-opacity hover:opacity-100"
          >
            Connexion
          </Link>
          <Link
            href="/inscription"
            className="control-signal rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Créer un compte
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

      {/* The sheet matches the bar's ground rather than always being dark glass, and
          sits on the same inset so the two read as one piece of chrome. */}
      {open && (
        <div
          className={cn(
            "mt-2 rounded-3xl p-6 backdrop-blur-md md:hidden",
            scrolled ? "mx-4 sm:mx-6" : "mx-0",
            dark ? "on-dark bg-ink/90 text-paper ring-1 ring-white/12" : "bg-paper/95 text-ink ring-1 ring-ink/10",
          )}
        >
          <ul className="flex flex-col gap-4 text-base font-medium">
            {items.map((item, i) => (
              <li key={`${item.label}-${i}`}>
                <Link href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                </Link>
                {item.children.length > 0 && (
                  <ul className={cn("mt-2 flex flex-col gap-2 border-l pl-4 text-sm", dark ? "border-white/15" : "border-ink/10")}>
                    {item.children.map((child, j) => (
                      <li key={`${child.label}-${j}`}>
                        <Link href={child.href} onClick={() => setOpen(false)} className="opacity-80">
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
            <li>
              <Link href="#contact" onClick={() => setOpen(false)}>
                Nous contacter
              </Link>
            </li>
          </ul>

          <div className={cn("mt-5 flex flex-col gap-3 border-t pt-5", dark ? "border-white/15" : "border-ink/10")}>
            <Link href="/connexion" onClick={() => setOpen(false)} className="text-base font-medium">
              Connexion
            </Link>
            <Link
              href="/inscription"
              onClick={() => setOpen(false)}
              className="control-signal rounded-full px-5 py-2.5 text-center text-sm font-medium"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
