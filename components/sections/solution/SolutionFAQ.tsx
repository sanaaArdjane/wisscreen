import type { Service } from "@/lib/types";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Accordion } from "@/components/ui/Accordion";

export function SolutionFAQ({ service }: { service: Service }) {
  return (
    <section id="faq" className="section-ink py-28">
      <Container className="grid grid-cols-1 gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <SectionHeading eyebrow="Questions fréquentes" title={`Tout savoir sur ${service.name}.`} />
        <Accordion items={service.faq.map((item) => ({ title: item.question, content: item.answer }))} />
      </Container>
    </section>
  );
}
