"use client";

import { useMemo, useState, type ComponentType } from "react";
import type { VentureProject } from "@/lib/domain/venture";
import { buildVentureWorkspaceData } from "@/lib/venture-workspace";
import type { WorkspaceSectionId } from "@/lib/venture-workspace";
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
import { ActivitySection } from "./ActivitySection";
import { MemorySection } from "./MemorySection";

interface VentureWorkspaceProps {
  venture: VentureProject;
}

const SECTION_COMPONENTS: Record<WorkspaceSectionId, ComponentType<{ data: ReturnType<typeof buildVentureWorkspaceData> }>> = {
  resumen: ExecutiveSummarySection,
  ceo: CeoDirectorSection,
  estado: VentureStatusSection,
  "startup-score": StartupScoreSection,
  "investment-readiness": InvestmentReadinessSection,
  "next-actions": NextActionsSection,
  timeline: TimelineSection,
  research: ResearchSection,
  product: ProductSection,
  architecture: ArchitectureSection,
  build: BuildSection,
  knowledge: KnowledgeSection,
  metrics: MetricsSection,
  activity: ActivitySection,
  memory: MemorySection,
};

export function VentureWorkspace({ venture }: VentureWorkspaceProps) {
  const [activeSection, setActiveSection] = useState<WorkspaceSectionId>("resumen");
  const data = useMemo(() => buildVentureWorkspaceData(venture), [venture]);

  const ActiveComponent = SECTION_COMPONENTS[activeSection];

  return (
    <VentureWorkspaceShell
      data={data}
      activeSection={activeSection}
      onSectionChange={(id) => setActiveSection(id as WorkspaceSectionId)}
    >
      <ActiveComponent data={data} />
    </VentureWorkspaceShell>
  );
}
