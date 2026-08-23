import Link from "next/link";
import { SERVICES } from "@/lib/data/services";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";

export function SolutionsGrid() {
  return (
    <section id="solutions" className="bg-paper py-28 text-ink">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow="Toutes nos solutions"
          title="Explorez chaque produit en détail."
          align="center"
          description="D'autres solutions rejoindront cet univers — cette page s'enrichira au fur et à mesure."
        />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {SERVICES.map((service) => (
            <Reveal key={service.slug}>
              <Link
                href={`/solutions/${service.slug}`}
                data-reveal-item
                className="group flex h-full flex-col gap-6 rounded-3xl border border-ink/10 p-8 transition-colors hover:border-teal/40"
              >
                <MediaSlot slot={service.media.hero} accent={service.palette.primary} />
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-ink/15 opacity-70">{service.category}</Badge>
                    {service.audiences.map((audience) => (
                      <Badge key={audience} className="border-accent/40 text-accent">
                        {audience}
                      </Badge>
                    ))}
                  </div>
                  <h3 className="text-2xl font-semibold">{service.name}</h3>
                  <p className="text-base leading-relaxed opacity-70">{service.heroDescription}</p>
                  <span className="mt-2 inline-flex w-fit items-center gap-2 text-sm font-medium text-teal-deep">
                    Découvrir {service.name}
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
