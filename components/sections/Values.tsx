import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Icon } from "@/components/ui/Icon";
import type { SectionContent } from "@/lib/content/schema";

export function Values({ content }: { content: SectionContent<"values"> }) {
  return (
    <section id="values" className="bg-paper py-28 text-ink">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          description={content.heading.description || undefined}
          align="center"
        />

        <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
          {content.items.map((value, i) => (
            <Reveal key={i} className="flex flex-col items-center gap-4 text-center">
              <span data-reveal-item className="flex h-14 w-14 items-center justify-center rounded-full bg-teal/15 text-teal-deep">
                <Icon name={value.icon} className="h-6 w-6" />
              </span>
              <p data-reveal-item className="text-lg font-semibold">{value.title}</p>
              <p data-reveal-item className="max-w-xs text-sm leading-relaxed opacity-70">{value.text}</p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
