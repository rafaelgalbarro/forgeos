"use client";

import { useState } from "react";
import type { VentureProject } from "@/lib/domain/venture";
import { buildVentureWorkspaceData } from "@/lib/venture-workspace";
import type { WorkspaceSectionId } from "@/lib/venture-workspace/types";
import { VentureWorkspaceShell } from "./VentureWorkspaceShell";
import { ExecutiveSummarySection } from "./ExecutiveSummarySection";
import { CeoDirectorSection } from "./CeoDirectorSection";
import { VentureStatusSection } from "./VentureStatusSection";
import { StartupScoreSection } from "./StartupScoreSection";
import { InvestmentReadinessSection } from "./InvestmentReadinessSection";
import { NextActionsSection } from "./NextActionsSection";
import { TimelineSection } from "./TimelineSection";
import { ResearchSection } from "./ResearchSection";
import { ProductSection } from "./ProductSection";
import { ArchitectureSection } from "./ArchitectureSection";
import { BuildSection } from "./BuildSection";
import { KnowledgeSection } from "./KnowledgeSection";
import { MetricsSection } from "./MetricsSection";

interface VentureWorkspaceViewProps {
  venture: VentureProject;
  initialSection?: WorkspaceSectionId;
}

function renderSection(id: WorkspaceSectionId, data: ReturnType<typeof buildVentureWorkspaceData>) {
  switch (id) {
    case "resumen":
      return <ExecutiveSummarySection data={data} />;
    case "ceo":
      return <CeoDirectorSection data={data} />;
    case "estado":
      return <VentureStatusSection data={data} />;
    case "startup-score":
      return <StartupScoreSection data={data} />;
    case "investment-readiness":
      return <InvestmentReadinessSection data={data} />;
    case "next-actions":
      return <NextActionsSection data={data} />;
    case "timeline":
      return <TimelineSection data={data} />;
    case "research":
      return <ResearchSection data={data} />;
    case "product":
      return <ProductSection data={data} />;
    case "architecture":
      return <ArchitectureSection data={data} />;
    case "build":
      return <BuildSection data={data} />;
    case "knowledge":
      return <KnowledgeSection data={data} />;
    case "metrics":
      return <MetricsSection data={data} />;
    default:
      return <ExecutiveSummarySection data={data} />;
  }
}

export function VentureWorkspaceView({ venture, initialSection = "resumen" }: VentureWorkspaceViewProps) {
  const [activeSection, setActiveSection] = useState<WorkspaceSectionId>(initialSection);
  const data = buildVentureWorkspaceData(venture);

  return (
    <VentureWorkspaceShell
      data={data}
      activeSection={activeSection}
      onSectionChange={(id) => setActiveSection(id as WorkspaceSectionId)}
    >
      {renderSection(activeSection, data)}
    </VentureWorkspaceShell>
  );
}
