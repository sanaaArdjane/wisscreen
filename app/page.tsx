import { Hero } from "@/components/sections/Hero";
import { HighlightsReel } from "@/components/sections/HighlightsReel";
import { PerformanceMetrics } from "@/components/sections/PerformanceMetrics";
import { UniverseReveal } from "@/components/sections/UniverseReveal";
import { DeviceShowcase } from "@/components/sections/DeviceShowcase";
import { DataIntelligence } from "@/components/sections/DataIntelligence";
import { Reliability } from "@/components/sections/Reliability";
import { PlatformShowcase } from "@/components/sections/PlatformShowcase";
import { ConnectedSolutions } from "@/components/sections/ConnectedSolutions";
import { AudienceTabs } from "@/components/sections/AudienceTabs";
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

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
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
