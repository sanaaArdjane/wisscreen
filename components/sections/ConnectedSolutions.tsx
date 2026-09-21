import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import type { SectionContent } from "@/lib/content/schema";

export function ConnectedSolutions({ content }: { content: SectionContent<"connected"> }) {
  return (
    <section id="connected" className="section-ink py-28">
      <Container className="flex flex-col gap-14">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          description={content.heading.description || undefined}
        />

        <div className="flex flex-col gap-6">
          {content.links.map((link, i) => (
            <Reveal key={i} className="flex flex-col gap-4 rounded-3xl border border-white/10 p-6 md:flex-row md:items-center md:gap-8 md:p-8">
              <div data-reveal-item className="flex shrink-0 items-center gap-3">
                <Badge className="border-aqua/40 text-aqua">{link.from}</Badge>
                <Icon name="link" className="h-4 w-4 opacity-50" />
                <Badge className="border-teal/40 text-aqua">{link.to}</Badge>
              </div>
              <p data-reveal-item className="text-base leading-relaxed opacity-75">
                {link.text}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
