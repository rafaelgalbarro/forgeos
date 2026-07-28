/** Program 4500 — Self Evolution panel. */

import { runSelfEvolutionEngine, computeAggregateRoi } from "@/lib/self-evolution";
import type { SelfEvolutionPanelData } from "./types";

export function buildSelfEvolutionPanel(): SelfEvolutionPanelData {
  const snapshot = runSelfEvolutionEngine();
  const report = snapshot.report;

  return {
    improvementsDetected: report.observations.length,
    proposals: report.proposals.slice(0, 5).map((p) => {
      const risk = report.riskAssessments.find((r) => r.proposalId === p.id);
      return {
        id: p.id,
        title: p.title,
        roi: `${p.roiScore}%`,
        risk: risk?.overallRisk ?? p.risk,
        status: p.status,
      };
    }),
    aggregateRoi: computeAggregateRoi(report.proposals),
    aggregateRisk: report.proposals[0]?.risk ?? "medio",
    healthScore: report.healthScore.overall,
    href: "/self-evolution",
  };
}
