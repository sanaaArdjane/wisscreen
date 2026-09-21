import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import type { SectionContent } from "@/lib/content/schema";

export function Integrations({ content }: { content: SectionContent<"integrations"> }) {
  return (
    <section id="integrations" className="section-ink py-28">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          description={content.heading.description || undefined}
        />

        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {content.items.map((item, i) => (
            <Reveal key={i} className="flex flex-col gap-4 rounded-3xl border border-white/10 p-7">
              <span data-reveal-item className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-aqua">
                <Icon name={item.icon} className="h-5 w-5" />
              </span>
              <p data-reveal-item className="text-lg font-semibold">{item.title}</p>
              <p data-reveal-item className="text-sm leading-relaxed opacity-65">{item.text}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
