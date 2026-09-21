import type { Service } from "@/lib/types";
import type { SectionContent } from "@/lib/content/schema";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { Icon } from "@/components/ui/Icon";

export function OcrDemo({
  content,
  solution: ocr,
}: {
  content: SectionContent<"ocrDemo">;
  /** Whose first gallery slot fills the panel (`content.solutionSlug`). */
  solution?: Service;
}) {
  if (!ocr) return null;

  return (
    <section id="ocr-demo" className="bg-paper py-28 text-ink">
      <Container className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <Reveal>
          <div data-reveal-item>
            {ocr.media.gallery[0] && <MediaSlot slot={ocr.media.gallery[0]} accent={ocr.palette.primary} />}
          </div>
        </Reveal>

        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow={content.heading.eyebrow}
            title={content.heading.title}
            description={content.heading.description || undefined}
          />
          <Reveal className="flex flex-col divide-y divide-ink/10 rounded-2xl border border-ink/10">
            {content.fields.map((field, i) => (
              <div key={i} data-reveal-item className="flex items-center justify-between px-6 py-4">
                <span className="text-sm font-medium">{field.label}</span>
                <span className="flex items-center gap-2 text-sm font-medium text-teal-deep">
                  <Icon name="check" className="h-4 w-4" strokeWidth={2} />
                  {field.value}
                </span>
              </div>
            ))}
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
