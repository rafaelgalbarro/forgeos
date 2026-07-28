/** Program 2035 — Internal self-roadmap. */

import type { ImprovementProposal, RoadmapItem } from "./types";

export function buildRoadmap(proposals: ImprovementProposal[]): RoadmapItem[] {
  const quarters = ["Q3 2026", "Q4 2026", "Q1 2027"];
  return proposals.slice(0, 6).map((p, i) => ({
    id: `road-${p.id}`,
    title: p.title,
    quarter: quarters[i % quarters.length]!,
    area: p.affectedArea,
    priority: p.priority,
    status: i === 0 ? "in-progress" : "planned",
    linkedProposalIds: [p.id],
  }));
}

export function getRoadmapByQuarter(
  items: RoadmapItem[],
  quarter: string
): RoadmapItem[] {
  return items.filter((r) => r.quarter === quarter);
}
