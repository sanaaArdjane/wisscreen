"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SERVICES } from "@/lib/data/services";
import { cn } from "@/lib/cn";

export function Navbar() {
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
          Wissal <span className="text-accent">Univers</span>
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

        <div className="hidden md:block">
          <Link
            href="#contact"
            className="control-signal rounded-full px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Nous contacter
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
          aria-label="Ouvrir le menu"
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
              <Link href="#contact" onClick={() => setOpen(false)} className="text-accent">
                Nous contacter
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
