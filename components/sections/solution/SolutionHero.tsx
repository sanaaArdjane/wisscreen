import type { Service } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SolutionHeroStage } from "@/components/sections/solution/SolutionHeroStage";

/**
 * The copy half of the solution hero. `SolutionHeroStage` owns the ground, the browser
 * frame and the stretch states; this stays a server component so the headline is static
 * markup, and it is passed in as children rather than duplicated inside the client
 * component.
 *
 * It is a **single narrow column**: the stage gives it 30% of the width and the frame the
 * rest, so the type ramp here is set for a ~20-24rem measure rather than for the page. That
 * is also why the headline caps at `xl:text-6xl` — at `text-8xl` a name like WIFACILITY
 * would not fit the column at any breakpoint the column exists at.
 *
 * Entrances are `hero-rise` (CSS, `fill-mode: both`) rather than the site's scroll
 * `Reveal`: this is above the fold, so there is no scroll to trigger on, and the CSS
 * version holds its hidden state through the delay instead of flashing in first. It
 * animates `opacity` to 1, which is why every muted line here is `text-paper/NN` and
 * never `opacity-NN` — the utility would be overridden mid-animation.
 */
export function SolutionHero({ service }: { service: Service }) {
  return (
    <SolutionHeroStage service={service}>
      <div className="flex flex-col gap-5">
        <div className="hero-rise flex flex-wrap items-center gap-2" style={{ animationDelay: "0.12s" }}>
          <Badge className="border-signal/40 text-signal">{service.category}</Badge>
          {service.audiences.map((audience) => (
            <Badge key={audience} className="border-white/20 text-paper/70">
              {audience}
            </Badge>
          ))}
        </div>

        <h1
          className="hero-rise font-display text-balance text-4xl font-semibold leading-[1.02] md:text-5xl xl:text-6xl"
          style={{ animationDelay: "0.24s" }}
        >
          {service.name}
        </h1>

        <p
          className="hero-rise text-balance text-lg leading-relaxed text-paper/85 md:text-xl"
          style={{ animationDelay: "0.36s" }}
        >
          {service.tagline}
        </p>

        <p className="hero-rise text-sm leading-relaxed text-paper/75" style={{ animationDelay: "0.48s" }}>
          {service.heroDescription}
        </p>

        <div className="hero-rise flex flex-wrap gap-3" style={{ animationDelay: "0.6s" }}>
          <Button href="#contact" variant="primary">
            Demander une démo
          </Button>
          <Button href="#video" variant="ghost">
            Voir en action
          </Button>
        </div>

        <p
          className="hero-rise text-xs font-semibold uppercase tracking-[0.14em] text-paper/60"
          style={{ animationDelay: "0.72s" }}
        >
          {service.team}
        </p>
      </div>
    </SolutionHeroStage>
  );
}
