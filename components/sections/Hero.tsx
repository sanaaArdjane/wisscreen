import type { Service } from "@/lib/types";
import type { HeroContent } from "@/lib/content/schema";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TypeCycle } from "@/components/ui/TypeCycle";
import { HeroVisual } from "./hero/HeroVisual";

/**
 * The hero: **copy on the left 30%, a visual on the right 70%** (stacked, visual first,
 * below `lg`). Everything in it is edited in /admin/site/hero — the text, and which of
 * the five visuals fills the panel (the 3D globe, the 3D infrastructure stack, an image,
 * a video, or a slideshow). See `HeroVisual`.
 *
 * A server component: the copy is plain HTML in the first response, and only the panel
 * (and `TypeCycle`) hydrate.
 */
export function Hero({ content, solutions }: { content: HeroContent; solutions: Service[] }) {
  const is3d = content.visual.mode === "earth" || content.visual.mode === "stack";

  return (
    <section className="section-abyss relative overflow-hidden">
      <div className="relative grid min-h-[100svh] grid-cols-1 lg:grid-cols-[minmax(0,30fr)_minmax(0,70fr)]">
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
              <Badge className="border-signal/40 text-signal">{content.badge}</Badge>
            </div>
          )}

          <h1
            className="hero-rise font-display text-4xl font-semibold leading-[1.06] md:text-5xl lg:text-[2.6rem] xl:text-[3.25rem]"
            style={{ animationDelay: "0.27s" }}
          >
            {content.headline}{" "}
            <span className="block">
              <TypeCycle words={content.words} className="text-aqua" />
            </span>
          </h1>

          {/* Muted via text-paper/NN rather than opacity-NN: `hero-rise` animates the
              opacity property to 1, which would override an opacity utility. */}
          {content.paragraph && (
            <p
              className="hero-rise max-w-xl text-base leading-relaxed text-paper/75 md:text-lg lg:text-base xl:text-lg"
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
              className="hero-rise text-xs uppercase tracking-[0.16em] text-paper/70"
              style={{ animationDelay: "0.63s" }}
            >
              {content.hint}
            </p>
          )}
        </div>
      </div>

      {/* Seam falloff. The hero and HighlightsReel both sit on `abyss`; this fades the
          visual's bottom edge into it so the scene sinks into the next section instead of
          ending on a line. Above the canvas, below the labels. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[18%] bg-gradient-to-t from-abyss to-transparent" />
    </section>
  );
}
