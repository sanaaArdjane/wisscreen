"use client";

import Link from "next/link";
import type { Audience, Service } from "@/lib/types";
import type { SectionContent } from "@/lib/content/schema";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tabs } from "@/components/ui/Tabs";
import { Icon } from "@/components/ui/Icon";

const ORDER: Audience[] = ["banques", "entreprises", "partenaires", "particuliers"];

export function AudienceTabs({
  content,
  solutions,
}: {
  content: SectionContent<"audiences">;
  solutions: Service[];
}) {
  const tabs = ORDER.filter((audience) => solutions.some((service) => service.audiences.includes(audience))).map(
    (audience) => ({ id: audience, label: content.labels[audience] }),
  );

  return (
    <section id="pour-qui" className="section-paper py-24 md:py-32 lg:py-40 text-ink">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          description={content.heading.description || undefined}
        />

        <Tabs tabs={tabs}>
          {(active) => {
            const filtered = solutions.filter((service) => service.audiences.includes(active as Audience));
            return (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
                {filtered.map((service) => (
                  <Link
                    key={service.slug}
                    href={`/solutions/${service.slug}`}
                    className="group flex flex-col gap-4 rounded-2xl bg-mist p-8 transition-colors hover:bg-mint"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper text-signal">
                      <Icon name={service.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-steel">{service.category}</p>
                      <p className="mt-1 text-xl font-medium">{service.name}</p>
                      <p className="mt-2 text-base leading-relaxed text-ink/80">{service.tagline}</p>
                    </div>
                    <span className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-signal">
                      {content.ctaLabel}
                      <Icon name="arrow-right" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                ))}
              </div>
            );
          }}
        </Tabs>
      </Container>
    </section>
  );
}
