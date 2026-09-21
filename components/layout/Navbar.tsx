"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

/** Only what the nav draws, so the client payload stays small. */
export type NavSolution = { slug: string; name: string; shortName: string };

export function Navbar({ solutions: SERVICES }: { solutions: NavSolution[] }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "on-dark fixed inset-x-0 top-0 z-50 transition-all duration-500",
        scrolled ? "glass-panel border-b border-white/10 py-3" : "bg-transparent py-6",
      )}
    >
      <nav className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 text-paper md:px-10">
        <Link href="/" className="text-sm font-semibold tracking-[0.14em] uppercase">
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

      {open && (
        <div className="glass-panel mx-6 mt-4 rounded-2xl p-6 text-paper md:hidden">
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

          <div className="mt-5 flex flex-col gap-3 border-t border-white/15 pt-5">
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
