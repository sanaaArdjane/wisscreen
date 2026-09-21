import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Accordion } from "@/components/ui/Accordion";
import type { SectionContent } from "@/lib/content/schema";

export function FAQHome({ content }: { content: SectionContent<"faq"> }) {
  return (
    <section id="faq" className="section-ink py-28">
      <Container className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          description={content.heading.description || undefined}
        />
        <Accordion items={content.items} />
      </Container>
    </section>
  );
}
