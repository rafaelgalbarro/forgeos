/** Program 4000 — Readiness levels. */

import type { ReadinessLevels, ValidationStage, VentureScoreBreakdown } from "./types";
import type { VentureIntelligenceSnapshot } from "@/lib/venture-intelligence";

export function computeReadinessLevels(
  stages: ValidationStage[],
  scores: VentureScoreBreakdown,
  intelligence: VentureIntelligenceSnapshot | null
): ReadinessLevels {
  const has = (id: ValidationStage["id"]) =>
    stages.find((s) => s.id === id)?.status === "completed";

  const prototypeScore = scoreStages(stages, ["idea", "research", "market", "prd"]);
  const mvpScore = scoreStages(stages, ["architecture", "frontend-plan", "backend-plan", "database-plan", "build-context"]);
  const betaScore = scoreStages(stages, ["build-dna", "deployment-preview", "landing"]);
  const investorScore = intelligence?.investorReadiness.score ?? scores.businessScore;
  const launchScore = scoreStages(stages, ["go-to-market", "launch-checklist", "investor-readiness"]);

  return {
    prototypeReady: prototypeScore >= 70 && has("prd"),
    mvpReady: mvpScore >= 65 && has("build-context"),
    betaReady: betaScore >= 55 && has("deployment-preview"),
    investorReady: investorScore >= 60,
    launchReady: launchScore >= 75 && scores.overallVentureScore >= 65,
    prototypeScore,
    mvpScore,
    betaScore,
    investorScore,
    launchScore,
  };
}

function scoreStages(stages: ValidationStage[], ids: ValidationStage["id"][]): number {
  const subset = stages.filter((s) => ids.includes(s.id));
  if (!subset.length) return 0;
  const weights: Record<ValidationStage["status"], number> = {
    completed: 100,
    in_progress: 55,
    not_started: 10,
    blocked: 0,
  };
  return Math.round(subset.reduce((sum, s) => sum + weights[s.status], 0) / subset.length);
}
