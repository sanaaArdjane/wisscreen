"use client";

import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { HeroSlide } from "@/lib/content/schema";
import { LoadingImage } from "@/components/ui/LoadingImage";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";
import { HeroVideo } from "./HeroVideo";

const REDUCE_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const subscribe = (onChange: () => void) => {
  const q = window.matchMedia(REDUCE_MOTION_QUERY);
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
};

/**
 * The hero's slideshow: photos and clips, `interval` seconds each.
 *
 * - Only slide 0 is `priority`; the others load lazily as the deck approaches them,
 *   so a ten-slide show costs one image at first paint.
 * - Only the visible slide's video plays (`active`), the rest sit paused.
 * - Autoplay pauses on hover and focus, and never starts under reduced motion — the
 *   arrows and dots still work.
 */
export function HeroSlides({ slides, interval }: { slides: HeroSlide[]; interval: number }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: slides.length > 1 });
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState(false);
  const reduceMotion = useSyncExternalStore(subscribe, () => window.matchMedia(REDUCE_MOTION_QUERY).matches, () => false);

  const onSelect = useCallback(() => {
    if (embla) setSelected(embla.selectedScrollSnap());
  }, [embla]);

  useEffect(() => {
    if (!embla) return;
    embla.on("select", onSelect);
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla, onSelect]);

  useEffect(() => {
    if (!embla || hovered || reduceMotion || slides.length < 2) return;
    const id = window.setInterval(() => embla.scrollNext(), interval * 1000);
    return () => window.clearInterval(id);
  }, [embla, hovered, reduceMotion, interval, slides.length, selected]);

  return (
    <div
      className="absolute inset-0"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      role="region"
      aria-roledescription="carrousel"
      aria-label="Diaporama"
    >
      <div ref={emblaRef} className="h-full overflow-hidden">
        <div className="flex h-full">
          {slides.map((slide, i) => (
            <div
              key={i}
              className="relative h-full min-w-0 flex-[0_0_100%]"
              role="group"
              aria-roledescription="diapositive"
              aria-label={`${i + 1} sur ${slides.length}`}
            >
              {slide.kind === "video" ? (
                <HeroVideo src={slide.src} poster={slide.poster} active={i === selected} />
              ) : (
                <LoadingImage
                  src={slide.src}
                  alt={slide.caption}
                  sizes="(min-width: 1024px) 70vw, 100vw"
                  className="object-cover"
                  priority={i === 0}
                />
              )}
              {slide.caption && (
                <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-abyss/90 to-transparent px-6 pb-16 pt-16 text-sm font-medium text-paper md:text-base">
                  {slide.caption}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {slides.length > 1 && (
        <>
          <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-abyss/60 px-3 py-2 backdrop-blur">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => embla?.scrollTo(i)}
                aria-label={`Diapositive ${i + 1}`}
                aria-current={i === selected}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === selected ? "w-8 bg-signal" : "w-1.5 bg-white/50 hover:bg-white/80",
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => embla?.scrollPrev()}
            aria-label="Diapositive précédente"
            className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 rotate-180 items-center justify-center rounded-full border border-white/20 bg-abyss/60 text-paper backdrop-blur transition-colors hover:border-aqua"
          >
            <Icon name="chevron-right" className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => embla?.scrollNext()}
            aria-label="Diapositive suivante"
            className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-abyss/60 text-paper backdrop-blur transition-colors hover:border-aqua"
          >
            <Icon name="chevron-right" className="h-5 w-5" />
          </button>
        </>
      )}
    </div>
  );
}
