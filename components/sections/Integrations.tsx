import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import type { SectionContent } from "@/lib/content/schema";

export function Integrations({ content }: { content: SectionContent<"integrations"> }) {
  return (
    <section id="integrations" className="section-tint texture-3d py-24 md:py-32 lg:py-40">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          description={content.heading.description || undefined}
        />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          {content.items.map((item, i) => (
            <Reveal key={i} className="flex flex-col gap-4 rounded-2xl bg-paper p-8 md:p-10">
              <span data-reveal-item className="flex h-11 w-11 items-center justify-center rounded-2xl bg-mist text-signal">
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              <p data-reveal-item className="text-lg font-medium">{item.title}</p>
              <p data-reveal-item className="text-base leading-relaxed text-ink/80">{item.text}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
