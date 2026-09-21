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
    <section id="pour-qui" className="bg-paper py-28 text-ink">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          description={content.heading.description || undefined}
        />

        <Tabs tabs={tabs}>
          {(active) => {
            const filtered = solutions.filter((service) => service.audiences.includes(active as Audience));
            return (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((service) => (
                  <Link
                    key={service.slug}
                    href={`/solutions/${service.slug}`}
                    className="group flex flex-col gap-4 rounded-3xl border border-ink/10 p-6 transition-colors hover:border-teal/40"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-paper">
                      <Icon name={service.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-50">{service.category}</p>
                      <p className="mt-1 text-xl font-semibold">{service.name}</p>
                      <p className="mt-2 text-sm leading-relaxed opacity-70">{service.tagline}</p>
                    </div>
                    <span className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-teal-deep">
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
