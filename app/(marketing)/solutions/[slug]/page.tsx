import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSolution, getSolutions } from "@/lib/content";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbSchema,
  faqSchema,
  serviceSchema,
} from "@/lib/seo/schema";
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

// A solution added in /admin/site after the build has no pre-rendered page yet; it is
// rendered on its first visit and cached from then on. A hidden or unknown slug is a 404.
export const dynamicParams = true;
export const revalidate = 600;

export async function generateStaticParams(): Promise<Params[]> {
  return (await getSolutions()).map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getSolution(slug);
  if (!service) return {};

  const path = `/solutions/${service.slug}`;
  const title = service.name;
  const description = service.heroDescription;

  return {
    title,
    description,
    keywords: [service.name, service.category, service.tagline, "WICLOUD"],
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      title,
      description,
      // images omitted on purpose — this route's own opengraph-image.tsx attaches
      // automatically, same reasoning as the root layout.
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function SolutionPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const solutions = await getSolutions();
  const service = solutions.find((s) => s.slug === slug);
  if (!service) notFound();

  const faq = faqSchema(service);

  return (
    <main className="flex flex-1 flex-col">
      <JsonLd data={serviceSchema(service)} />
      <JsonLd data={breadcrumbSchema(service)} />
      {faq && <JsonLd data={faq} />}
      <SolutionHero service={service} />
      <SolutionStory service={service} />
      <SolutionFeatures service={service} />
      <SolutionSteps service={service} />
      <SolutionSubProjects service={service} />
      <SolutionVideoReveal service={service} />
      <SolutionMedia service={service} />
      <SolutionFAQ service={service} />
      <SolutionContact service={service} />
      <SolutionRelated others={solutions.filter((s) => s.slug !== service.slug)} />
    </main>
  );
}
