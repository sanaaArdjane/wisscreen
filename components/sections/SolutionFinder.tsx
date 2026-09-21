import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Badge } from "@/components/ui/Badge";
import type { SectionContent } from "@/lib/content/schema";

export function SolutionFinder({ content }: { content: SectionContent<"finder"> }) {
  return (
    <section id="finder" className="section-ink py-28">
      <Container className="flex flex-col gap-16">
        <SectionHeading
          eyebrow={content.heading.eyebrow}
          title={content.heading.title}
          description={content.heading.description || undefined}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {content.profiles.map((profile, i) => (
            <Reveal key={i} className="flex flex-col gap-5 rounded-3xl border border-white/10 p-8">
              <p data-reveal-item className="text-xl font-semibold">{profile.title}</p>
              <p data-reveal-item className="text-sm leading-relaxed opacity-70">{profile.text}</p>
              <div data-reveal-item className="mt-auto flex flex-wrap gap-3 pt-2">
                {profile.solutions.map((solution, j) => (
                  <Link key={j} href={`/solutions/${solution.slug}`}>
                    <Badge className="border-teal/40 text-aqua transition-colors hover:bg-aqua hover:text-ink">
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
