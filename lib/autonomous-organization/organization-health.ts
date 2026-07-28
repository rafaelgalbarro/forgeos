/** ForgeOS RC6.5 — organization health score. */

import { detectRisks } from "./risk-monitor";
import { getDepartmentWorkload } from "./department-runtime";
import { getActiveInitiatives } from "./initiative-engine";

export interface HealthAssessment {
  score: number;
  factors: { label: string; score: number }[];
}

export function computeOrganizationHealth(): HealthAssessment {
  const risks = detectRisks();
  const workload = getDepartmentWorkload();
  const initiatives = getActiveInitiatives();

  const riskPenalty = risks.reduce((s, r) => {
    const w = { critical: 15, high: 8, medium: 4, low: 2 }[r.severity];
    return s + w;
  }, 0);

  const overloadCount = workload.filter((w) => w.loadPercent > 75).length;
  const workloadPenalty = overloadCount * 3;

  const initiativeBonus = initiatives.filter((i) => i.status === "active").length * 2;

  const base = 100;
  const score = Math.max(0, Math.min(100, base - riskPenalty - workloadPenalty + initiativeBonus));

  return {
    score,
    factors: [
      { label: "Riesgos mitigados", score: Math.max(0, 100 - riskPenalty * 4) },
      { label: "Capacidad disponible", score: Math.max(0, 100 - overloadCount * 12) },
      { label: "Iniciativas activas", score: Math.min(100, 60 + initiativeBonus * 5) },
      { label: "Coordinación cross-dept", score: 78 },
    ],
  };
}
