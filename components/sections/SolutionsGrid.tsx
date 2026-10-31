import Link from "next/link";
import type { Service } from "@/lib/types";
import type { SectionContent } from "@/lib/content/schema";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";

export function SolutionsGrid({
  content,
  solutions,
}: {
  content: SectionContent<"solutionsGrid">;
  solutions: Service[];
}) {
  return (
    <section id="solutions" className="section-paper texture-3d texture-3d-room py-24 md:py-32 lg:py-40 text-ink">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          align="center"
          description={content.heading.description || undefined}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {solutions.map((service) => (
            <Reveal key={service.slug}>
              <Link
                href={`/solutions/${service.slug}`}
                data-reveal-item
                className="group flex h-full flex-col gap-6 rounded-2xl bg-mist p-8 transition-colors hover:bg-mint md:p-10"
              >
                <MediaSlot slot={service.media.hero} accent={service.palette.primary} />
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-ink/15 text-steel">{service.category}</Badge>
                    {service.audiences.map((audience) => (
                      <Badge key={audience} className="border-accent/40 text-accent">
                        {audience}
                      </Badge>
                    ))}
                  </div>
                  <h3 className="text-2xl font-medium">{service.name}</h3>
                  <p className="text-base leading-relaxed text-ink/80">{service.heroDescription}</p>
                  <span className="mt-2 inline-flex w-fit items-center gap-2 text-sm font-medium text-signal">
                    {content.ctaPrefix} {service.name}
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
