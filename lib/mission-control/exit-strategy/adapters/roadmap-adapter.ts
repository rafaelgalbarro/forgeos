/** PROGRAM 5600 — Read-only bridge to Roadmap Workspace. */

import type { Mission } from "../../types";
import type { AdaptationRecommendation } from "../types";
import { generateAdaptationPlan } from "../strategy-adaptations";
import type { ExitStrategyType } from "../types";

export interface RoadmapAdaptationContext {
  missionId: string;
  phase: Mission["phase"];
  recommendations: AdaptationRecommendation[];
  priorityMilestones: string[];
}

export function buildRoadmapAdaptation(mission: Mission, strategy: ExitStrategyType): RoadmapAdaptationContext {
  const plan = generateAdaptationPlan(strategy);
  const roadmapRecs = plan.recommendations.filter((r) => r.domain === "roadmap");

  const priorityMilestones = roadmapRecs
    .filter((r) => r.priority === "high")
    .map((r) => r.action);

  return {
    missionId: mission.id,
    phase: mission.phase,
    recommendations: roadmapRecs,
    priorityMilestones,
  };
}

export async function fetchRoadmapSnapshot(mission: Mission): Promise<{ items: Array<{ title: string; quarter: string; status: string }> } | null> {
  try {
    const { buildCompanyWorkspacesSnapshot } = await import("../../autonomous-company/workspace-snapshots");
    const snap = await buildCompanyWorkspacesSnapshot(mission.id, mission.phase);
    const items = (snap.roadmap ?? []).map((r) => ({ title: r.title, quarter: r.quarter, status: r.status }));
    return { items };
  } catch {
    return null;
  }
}
