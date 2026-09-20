import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { JsonLd } from "@/components/seo/JsonLd";
import { websiteSchema } from "@/lib/seo/schema";
import { Hero } from "@/components/sections/Hero";
import { HighlightsReel } from "@/components/sections/HighlightsReel";
import { PerformanceMetrics } from "@/components/sections/PerformanceMetrics";
import { DataIntelligence } from "@/components/sections/DataIntelligence";
import { Reliability } from "@/components/sections/Reliability";
import { PlatformShowcase } from "@/components/sections/PlatformShowcase";
import { ConnectedSolutions } from "@/components/sections/ConnectedSolutions";
import { ScaleSpecs } from "@/components/sections/ScaleSpecs";

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

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <JsonLd data={websiteSchema()} />
      <Hero />
      <HighlightsReel />
      <PerformanceMetrics />
      <UniverseReveal />
      <DeviceShowcase />
      <DataIntelligence />
      <Reliability />
      <PlatformShowcase />
      <ConnectedSolutions />
      <AudienceTabs />
      <ScaleSpecs />
      <OcrDemo />
      <Integrations />
      <Security />
      <SolutionFinder />
      <MigrationProgram />
      <WhyUs />
      <SolutionsGrid />
      <DataCommitment />
      <Values />
      <FAQHome />
      <Contact />
    </main>
  );
}
