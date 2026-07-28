/** Thin adapter — Self Evolution public API (Program 2035). */

import type { BacklogItem, RoadmapItem } from "../types";

export async function fetchSelfEvolutionRoadmap(): Promise<RoadmapItem[]> {
  const { runImprovementEngine } = await import("@/lib/self-evolution");
  const report = runImprovementEngine();
  return report.roadmap.map((r) => ({
    id: r.id,
    title: r.title,
    quarter: r.quarter,
    status: r.status === "in-progress" ? "in-progress" : r.status === "done" ? "done" : "planned",
    priority: r.priority === "critical" || r.priority === "high" ? "high" : r.priority === "medium" ? "medium" : "low",
  }));
}

export async function fetchSelfEvolutionBacklog(): Promise<BacklogItem[]> {
  const { runImprovementEngine } = await import("@/lib/self-evolution");
  const report = runImprovementEngine();
  return report.proposals.slice(0, 12).map((p) => ({
    id: p.id,
    title: p.title,
    priority:
      p.priority === "critical"
        ? "critical"
        : p.priority === "high"
          ? "high"
          : p.priority === "medium"
            ? "medium"
            : "low",
    status:
      p.status === "completed"
        ? "done"
        : p.status === "in-progress"
          ? "in_progress"
          : "todo",
    createdAt: p.createdAt,
    tags: [p.affectedArea],
  }));
}

export async function fetchSelfEvolutionHealthHint(): Promise<{ score: number; label: string }> {
  const { computeHealthScore } = await import("@/lib/self-evolution");
  const health = computeHealthScore();
  return { score: health.overall, label: `health-${Math.round(health.overall)}` };
}
