import type { Service } from "@/lib/types";
import type { SectionContent } from "@/lib/content/schema";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { MediaSlot } from "@/components/ui/MediaSlot";

export function PlatformShowcase({
  content,
  solutions,
}: {
  content: SectionContent<"platform">;
  solutions: Service[];
}) {
  return (
    <section id="platform" className="bg-paper py-28 text-ink">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          description={content.heading.description || undefined}
          align="center"
        />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {content.panels.map((panel, i) => {
            const service = solutions.find((s) => s.slug === panel.slug);
            if (!service) return null;
            return (
              <Reveal key={i} className="flex flex-col gap-5">
                <div data-reveal-item>
                  <MediaSlot slot={service.media.hero} accent={service.palette.primary} />
                </div>
                <div data-reveal-item>
                  <p className="text-lg font-semibold">{panel.title}</p>
                  <p className="mt-2 text-sm leading-relaxed opacity-70">{panel.text}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
