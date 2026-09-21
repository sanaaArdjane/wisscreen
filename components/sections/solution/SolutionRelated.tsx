import Link from "next/link";
import type { Service } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { Icon } from "@/components/ui/Icon";

/** The other published solutions, excluding the one this page is about. */
export function SolutionRelated({ others }: { others: Service[] }) {
  if (others.length === 0) return null;

  return (
    <section id="autres-solutions" className="py-28">
      <Container className="flex flex-col gap-16">
        <SectionHeading eyebrow="Découvrez aussi" title="Les autres solutions de l'écosystème." />

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          {others.map((other) => (
            <Reveal key={other.slug}>
              <Link href={`/solutions/${other.slug}`} data-reveal-item className="group flex flex-col gap-4">
                <MediaSlot slot={other.media.hero} accent={other.palette.primary} className="transition-transform duration-500 group-hover:scale-[1.02]" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-50">{other.category}</p>
                  <p className="mt-1 text-xl font-semibold">{other.name}</p>
                  <span className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-accent">
                    Découvrir
                    <Icon name="arrow-right" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
