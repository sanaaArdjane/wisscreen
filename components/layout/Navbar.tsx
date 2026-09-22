"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/** Only what the nav draws, so the client payload stays small. */
export type NavSolution = { slug: string; name: string; shortName: string };

export function Navbar({ solutions: SERVICES }: { solutions: NavSolution[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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
        <Link href="/" className="text-lg font-semibold uppercase tracking-[0.14em] md:text-xl">
          WI<span className="text-accent">CLOUD</span>
        </Link>

        <ul className="hidden items-center gap-8 text-sm font-medium md:flex">
          {SERVICES.map((service) => (
            <li key={service.slug}>
              <Link href={`/solutions/${service.slug}`} className="relative opacity-80 transition-opacity hover:opacity-100">
                {service.shortName}
              </Link>
            </li>
          ))}
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
            {SERVICES.map((service) => (
              <li key={service.slug}>
                <Link href={`/solutions/${service.slug}`} onClick={() => setOpen(false)}>
                  {service.name}
                </Link>
              </li>
            ))}
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
