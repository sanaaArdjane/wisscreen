import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SERVICES, getServiceBySlug } from "@/lib/data/services";
import { SolutionHero } from "@/components/sections/solution/SolutionHero";
import { SolutionStory } from "@/components/sections/solution/SolutionStory";
import { SolutionFeatures } from "@/components/sections/solution/SolutionFeatures";
import { SolutionSteps } from "@/components/sections/solution/SolutionSteps";
import { SolutionSubProjects } from "@/components/sections/solution/SolutionSubProjects";
import { SolutionVideoReveal } from "@/components/sections/solution/SolutionVideoReveal";
import { SolutionMedia } from "@/components/sections/solution/SolutionMedia";
import { SolutionFAQ } from "@/components/sections/solution/SolutionFAQ";
import { SolutionContact } from "@/components/sections/solution/SolutionContact";
import { SolutionRelated } from "@/components/sections/solution/SolutionRelated";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};

  return {
    title: `${service.name} — Wissal Univers`,
    description: service.heroDescription,
  };
}

export default async function SolutionPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  return (
    <main className="flex flex-1 flex-col">
      <SolutionHero service={service} />
      <SolutionStory service={service} />
      <SolutionFeatures service={service} />
      <SolutionSteps service={service} />
      <SolutionSubProjects service={service} />
      <SolutionVideoReveal service={service} />
      <SolutionMedia service={service} />
      <SolutionFAQ service={service} />
      <SolutionContact service={service} />
      <SolutionRelated service={service} />
    </main>
  );
}
