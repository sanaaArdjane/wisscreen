import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";
import type { SectionContent } from "@/lib/content/schema";

export function SolutionFinder({ content }: { content: SectionContent<"finder"> }) {
  return (
    <section id="finder" className="section-tint texture-3d py-24 md:py-32 lg:py-40">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          description={content.heading.description || undefined}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
          {content.profiles.map((profile, i) => (
            <Reveal key={i} className="flex flex-col gap-5 rounded-2xl bg-paper p-8 md:p-10">
              <p data-reveal-item className="text-xl font-medium">{profile.title}</p>
              <p data-reveal-item className="text-base leading-relaxed text-ink/80">{profile.text}</p>
              <div data-reveal-item className="mt-auto flex flex-wrap gap-3 pt-2">
                {profile.solutions.map((solution, j) => (
                  <Link key={j} href={`/solutions/${solution.slug}`}>
                    <Badge className="border-signal/40 text-signal transition-colors hover:bg-mint">
                      {solution.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
