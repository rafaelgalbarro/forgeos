import type { ProductPRDResponse } from "@/lib/ai/types/product";
import type { ResearchReportResponse } from "@/lib/ai/types/research";
import { buildVentureSections } from "@/lib/domain/venture-sections";
import type { VentureProject } from "@/lib/domain/venture";
import type { ProjectBundle } from "./types";
import { buildDeliverables } from "./deliverable-builder";

export interface ProjectBuilderInput {
  venture: VentureProject;
  productPRD?: ProductPRDResponse | null;
  researchReport?: ResearchReportResponse | null;
}

export function buildProject(input: ProjectBuilderInput): ProjectBundle {
  const sections =
    input.venture.sections.length > 0
      ? input.venture.sections
      : buildVentureSections(
          input.venture,
          input.productPRD ?? null,
          input.researchReport ?? null
        );
  const source = input.researchReport?.source ?? input.productPRD?.source ?? "mock";
  const deliverables = buildDeliverables(sections, source === "ai" ? "ai" : "mock");

  return {
    ventureId: input.venture.id,
    projectName: input.venture.name,
    documents: [
      {
        id: "venture-docs",
        title: "Venture Workspace",
        deliverables,
      },
    ],
    generatedAt: new Date().toISOString(),
  };
}
