import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import type { SectionContent } from "@/lib/content/schema";

export function ConnectedSolutions({ content }: { content: SectionContent<"connected"> }) {
  return (
    <section id="connected" className="section-tint texture-3d py-24 md:py-32 lg:py-40">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          description={content.heading.description || undefined}
        />

        <div className="flex flex-col gap-6">
          {content.links.map((link, i) => (
            <Reveal key={i} className="flex flex-col gap-4 rounded-2xl bg-paper p-8 md:flex-row md:items-center md:gap-10 md:p-10">
              <div data-reveal-item className="flex shrink-0 items-center gap-3">
                <Badge className="border-signal/40 text-signal">{link.from}</Badge>
                <Icon name="link" className="h-4 w-4 text-steel" />
                <Badge className="border-signal/40 text-signal">{link.to}</Badge>
              </div>
              <p data-reveal-item className="text-base leading-relaxed text-ink/80">
                {link.text}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
