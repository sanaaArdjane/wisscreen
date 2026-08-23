import { getServiceBySlug } from "@/lib/data/services";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { MediaSlot } from "@/components/ui/MediaSlot";
import { Icon } from "@/components/ui/Icon";

const EXTRACTED_FIELDS = [
  { label: "Nom / Prénom", value: "Reconnu" },
  { label: "Numéro de document", value: "Reconnu" },
  { label: "Date de naissance", value: "Reconnu" },
  { label: "Date d'expiration", value: "Reconnu" },
  { label: "Adresse", value: "Reconnu" },
];

export function OcrDemo() {
  const ocr = getServiceBySlug("ocr");
  if (!ocr) return null;

  return (
    <section className="bg-paper py-28 text-ink">
      <Container className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
        <Reveal>
          <div data-reveal-item>
            <MediaSlot slot={ocr.media.gallery[0]} accent={ocr.palette.primary} />
          </div>
        </Reveal>

        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="OCR en action"
            title="Un document. Des données structurées, en un instant."
            description="Chaque champ est détecté, lu et vérifié automatiquement — visualisez ce que voit le moteur OCR au moment de l'analyse."
          />
          <Reveal className="flex flex-col divide-y divide-ink/10 rounded-2xl border border-ink/10">
            {EXTRACTED_FIELDS.map((field) => (
              <div key={field.label} data-reveal-item className="flex items-center justify-between px-6 py-4">
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
