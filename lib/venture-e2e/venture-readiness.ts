/** Program 10000 — E2E readiness levels. */

import type { E2EReadiness, E2EStage, E2EVentureScores } from "./types";
import type { VentureIntelligenceSnapshot } from "@/lib/venture-intelligence";

export function computeE2EReadiness(
  stages: E2EStage[],
  scores: E2EVentureScores,
  intelligence: VentureIntelligenceSnapshot | null
): E2EReadiness {
  const has = (id: E2EStage["id"]) =>
    stages.find((s) => s.id === id)?.status === "completed";

  const prototypeScore = scoreStages(stages, ["idea", "research", "market", "prd"]);
  const mvpScore = scoreStages(stages, ["architecture", "build-context", "prd"]);
  const betaScore = scoreStages(stages, ["build-dna", "deployment-preview", "landing"]);
  const investorScore = intelligence?.investorReadiness.score ?? scores.businessScore;
  const launchScore = scoreStages(stages, ["go-to-market", "launch-checklist", "investor-readiness", "brand"]);

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

function scoreStages(stages: E2EStage[], ids: E2EStage["id"][]): number {
  const subset = stages.filter((s) => ids.includes(s.id));
  if (!subset.length) return 0;
  const weights: Record<E2EStage["status"], number> = {
    completed: 100,
    in_progress: 55,
    not_started: 10,
    blocked: 0,
  };
  return Math.round(subset.reduce((sum, s) => sum + weights[s.status], 0) / subset.length);
}
