import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { JsonLd } from "@/components/seo/JsonLd";
import { websiteSchema } from "@/lib/seo/schema";
import { getSiteContent, getSolutions } from "@/lib/content";
import { Hero } from "@/components/sections/Hero";
import { HighlightsReel } from "@/components/sections/HighlightsReel";
import { PerformanceMetrics } from "@/components/sections/PerformanceMetrics";
import { DataIntelligence } from "@/components/sections/DataIntelligence";
import { Reliability } from "@/components/sections/Reliability";
import { PlatformShowcase } from "@/components/sections/PlatformShowcase";
import { ConnectedSolutions } from "@/components/sections/ConnectedSolutions";
import { ScaleSpecs } from "@/components/sections/ScaleSpecs";
import { OcrDemo } from "@/components/sections/OcrDemo";
import { Integrations } from "@/components/sections/Integrations";
import { Security } from "@/components/sections/Security";
import { SolutionFinder } from "@/components/sections/SolutionFinder";
import { MigrationProgram } from "@/components/sections/MigrationProgram";
import { WhyUs } from "@/components/sections/WhyUs";
import { SolutionsGrid } from "@/components/sections/SolutionsGrid";
import { DataCommitment } from "@/components/sections/DataCommitment";
import { Values } from "@/components/sections/Values";
import { FAQHome } from "@/components/sections/FAQHome";
import { Contact } from "@/components/sections/Contact";

// Split out of the initial hydration bundle: still server-rendered (ssr: true, the
// default) so content and SEO are unaffected, but each gets its own chunk instead of
// competing with everything else for main-thread time during the initial load — these
// three carry the heaviest client-side setup (GSAP/ScrollTrigger, pinned-scroll video
// math, live iframes) among the below-the-fold sections.
const UniverseReveal = dynamic(() =>
  import("@/components/sections/UniverseReveal").then((m) => m.UniverseReveal),
);
const DeviceShowcase = dynamic(() =>
  import("@/components/sections/DeviceShowcase").then((m) => m.DeviceShowcase),
);
const AudienceTabs = dynamic(() =>
  import("@/components/sections/AudienceTabs").then((m) => m.AudienceTabs),
);

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Statically generated, and regenerated on demand: the content comes from
 * `lib/content` (cached, tagged), and every save in /admin/site expires its tag.
 * The time-based revalidate is only a safety net — e.g. for a build that had no
 * database and rendered the defaults.
 */
export const revalidate = 600;

export default async function Home() {
  const [content, solutions] = await Promise.all([getSiteContent(), getSolutions()]);
  const s = content.sections;
  const bySlug = (slug: string) => solutions.find((x) => x.slug === slug);
  const hasSolutions = solutions.length > 0;

  return (
    <main className="flex flex-1 flex-col">
      <JsonLd data={websiteSchema()} />
      <Hero content={content.hero} solutions={solutions} />
      {!s.highlights.hidden && hasSolutions && <HighlightsReel content={s.highlights} solutions={solutions} />}
      {!s.performance.hidden && hasSolutions && <PerformanceMetrics content={s.performance} solutions={solutions} />}
      {!s.reveal.hidden && <UniverseReveal content={s.reveal} />}
      {!s.devices.hidden && hasSolutions && <DeviceShowcase content={s.devices} solutions={solutions} />}
      {!s.dataIntelligence.hidden && (
        <DataIntelligence content={s.dataIntelligence} solution={bySlug(s.dataIntelligence.solutionSlug)} />
      )}
      {!s.reliability.hidden && <Reliability content={s.reliability} />}
      {!s.platform.hidden && <PlatformShowcase content={s.platform} solutions={solutions} />}
      {!s.connected.hidden && <ConnectedSolutions content={s.connected} />}
      {!s.audiences.hidden && hasSolutions && <AudienceTabs content={s.audiences} solutions={solutions} />}
      {!s.scale.hidden && <ScaleSpecs content={s.scale} />}
      {!s.ocrDemo.hidden && <OcrDemo content={s.ocrDemo} solution={bySlug(s.ocrDemo.solutionSlug)} />}
      {!s.integrations.hidden && <Integrations content={s.integrations} />}
      {!s.security.hidden && <Security content={s.security} />}
      {!s.finder.hidden && <SolutionFinder content={s.finder} />}
      {!s.migration.hidden && <MigrationProgram content={s.migration} />}
      {!s.whyUs.hidden && <WhyUs content={s.whyUs} />}
      {!s.solutionsGrid.hidden && hasSolutions && <SolutionsGrid content={s.solutionsGrid} solutions={solutions} />}
      {!s.commitment.hidden && <DataCommitment content={s.commitment} />}
      {!s.values.hidden && <Values content={s.values} />}
      {!s.faq.hidden && <FAQHome content={s.faq} />}
      {!s.contact.hidden && <Contact content={s.contact} contact={content.general.contact} solutions={solutions} />}
    </main>
  );
}
