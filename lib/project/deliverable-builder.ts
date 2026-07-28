import type { VentureSection } from "@/lib/domain/venture";
import type { ProjectDeliverable, ProjectDeliverableId } from "./types";

const DELIVERABLE_MAP: Partial<Record<VentureSection["id"], ProjectDeliverableId>> = {
  prd: "prd",
  roadmap: "roadmap",
  wireframes: "wireframes",
  arquitectura: "architecture",
  "base-datos": "sql",
  backend: "backend",
  frontend: "frontend",
  landing: "landing",
  kpis: "kpis",
  pricing: "pricing",
};

export function buildDeliverables(
  sections: VentureSection[],
  source: "mock" | "ai" | "heuristic" = "mock"
): ProjectDeliverable[] {
  return sections.flatMap((section) => {
    const deliverableId = DELIVERABLE_MAP[section.id];
    if (!deliverableId) return [];
    return [{
      id: deliverableId,
      title: section.title,
      format: section.format,
      content: section.content,
      source,
    } satisfies ProjectDeliverable];
  });
}
