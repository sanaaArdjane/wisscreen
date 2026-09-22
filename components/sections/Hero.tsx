import type { CSSProperties } from "react";
import type { Service } from "@/lib/types";
import type { HeroContent } from "@/lib/content/schema";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TypeCycle } from "@/components/ui/TypeCycle";
import { HeroVisual } from "./hero/HeroVisual";

/**
 * The hero: **copy on the left, a visual on the right**, on a LIGHT ground (stacked,
 * visual first, below `lg`). The split is `visual.split` — 60% to the visual by default,
 * set by the owner in /admin/site/hero. Everything in it is edited in /admin/site/hero — the text, and which of
 * the five visuals fills the panel (the 3D globe, the 3D infrastructure stack, an image,
 * a video, or a slideshow). See `HeroVisual`.
 *
 * The ground is `.texture-weave` (app/globals.css): a pale cool gradient under a fine
 * woven grid, lightest where the copy sits. The 3D scene is full-bleed and transparent on
 * top of it — it has no dark panel and no sky of its own, so the whole hero is one light
 * surface.
 *
 * A server component: the copy is plain HTML in the first response, and only the panel
 * (and `TypeCycle`) hydrate.
 */
export function Hero({ content, solutions }: { content: HeroContent; solutions: Service[] }) {
  const is3d = content.visual.mode === "earth" || content.visual.mode === "stack";
  const split = content.visual.split;

  return (
    <section className="texture-weave relative overflow-hidden text-ink">
      {/* The split is owned by the owner (/admin/site/hero) and can't be a static
          Tailwind class, so the two tracks go through a CSS variable. The arbitrary value
          is still breakpoint-scoped, which is what keeps the single column below `lg`
          where the two stack. */}
      <div
        className="relative grid min-h-[100svh] grid-cols-1 lg:grid-cols-[var(--hero-split)]"
        style={{ "--hero-split": `minmax(0,${100 - split}fr) minmax(0,${split}fr)` } as CSSProperties}
      >
        {/* The visual. First in the DOM order below `lg` so it leads on a phone; the
            grid puts it on the right from `lg` up. */}
        <div className="relative order-1 h-[58svh] min-h-[22rem] lg:order-2 lg:h-auto lg:min-h-[100svh]">
          <HeroVisual visual={content.visual} solutions={solutions} />
        </div>

        {/* The copy. z-30 keeps it above the scene's label overlay where the two meet. */}
        <div className="relative z-30 order-2 flex flex-col justify-center gap-5 px-6 pb-16 pt-4 md:px-10 lg:order-1 lg:py-28 lg:pl-12 lg:pr-4 xl:pl-16">
          {/* `hero-rise` is a CSS animation with fill-mode both, so each line holds its
              hidden state through its delay and never flashes in first. */}
          {content.badge && (
            <div className="hero-rise" style={{ animationDelay: "0.15s" }}>
              {/* `bg-paper`, and it is the one thing on this ground that needs an opaque
                  chip. Measured against `.texture-weave`: every other line clears its
                  floor on the bare gradient at every width, but `signal-deep` on the
                  deepest part the badge reaches (mobile, where the copy sits below the
                  visual) is 3.71:1. A white pill fixes just that one element and is why
                  the copy needs no wash behind it at all — the weave runs unbroken. */}
              <Badge className="border-signal/40 bg-paper text-signal">{content.badge}</Badge>
            </div>
          )}

          <h1
            className="hero-rise font-display text-4xl font-semibold leading-[1.06] md:text-5xl lg:text-[2.6rem] xl:text-[3.25rem]"
            style={{ animationDelay: "0.27s" }}
          >
            {content.headline}{" "}
            <span className="block">
              <TypeCycle words={content.words} className="text-accent" caretClassName="bg-signal-deep" />
            </span>
          </h1>

          {/* Muted via text-ink/NN rather than opacity-NN: `hero-rise` animates the
              opacity property to 1, which would override an opacity utility. And /80
              rather than /70 — ink at 70% on paper is 4.12:1, under the floor. */}
          {content.paragraph && (
            <p
              className="hero-rise max-w-xl text-base leading-relaxed text-ink/80 md:text-lg lg:text-base xl:text-lg"
              style={{ animationDelay: "0.39s" }}
            >
              {content.paragraph}
            </p>
          )}

          <div className="hero-rise flex flex-wrap items-center gap-3" style={{ animationDelay: "0.51s" }}>
            {content.primaryCta.label && (
              <Button href={content.primaryCta.href || "#solutions"} variant="primary">
                {content.primaryCta.label}
              </Button>
            )}
            {content.secondaryCta.label && (
              <Button href={content.secondaryCta.href || "#contact"} variant="ghost">
                {content.secondaryCta.label}
              </Button>
            )}
          </div>

          {is3d && content.hint && (
            <p
              className="hero-rise text-xs uppercase tracking-[0.16em] text-ink/80"
              style={{ animationDelay: "0.63s" }}
            >
              {content.hint}
            </p>
          )}
        </div>
      </div>

      {/* No seam falloff any more: the hero is paper and HighlightsReel is `abyss`, so the
          boundary is a deliberate light -> dark change. A gradient to abyss over a light
          section is just a dark smear. */}
    </section>
  );
}
