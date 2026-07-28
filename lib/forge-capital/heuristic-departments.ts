/** RC8 — Heuristic AI departments (client-safe, no AI runtime import). */

import type {
  CapitalAiDepartmentId,
  CapitalAiDepartmentResult,
  VentureFinancialInputs,
  VentureIntelligenceSnapshot,
} from "@/lib/venture-intelligence/types";
import { HEURISTIC_DISCLAIMER } from "@/lib/venture-intelligence/types";
import { formatValuationEs } from "@/lib/venture-intelligence/valuation-engine";

const DEPARTMENT_NAMES: Record<CapitalAiDepartmentId, string> = {
  "investment-ai": "Investment AI",
  "finance-ai": "Finance AI",
  "growth-ai": "Growth AI",
  "capital-ai": "Capital AI",
  "board-advisor-ai": "Board Advisor AI",
  "market-intelligence-ai": "Market Intelligence AI",
};

function heuristicInsight(
  dept: CapitalAiDepartmentId,
  snapshot: VentureIntelligenceSnapshot
): string {
  const v = snapshot.valuation;
  const r = snapshot.runway;
  const f = snapshot.fundraising;

  switch (dept) {
    case "investment-ai":
      return `Ronda ${f.targetRound} recomendada: ${f.amountNeededEur.toLocaleString("es-ES")} €. Valoración ~${formatValuationEs(v.amountEur)}.`;
    case "finance-ai":
      return `Burn neto ~${snapshot.burnRate.netBurn.toLocaleString("es-ES")} €/mes. Cobertura ingresos: ${snapshot.burnRate.revenueCoveragePct}%.`;
    case "growth-ai":
      return `Growth score ${snapshot.growthScore.score}/100. MRR growth y base de clientes son drivers clave.`;
    case "capital-ai":
      return `Runway ${Math.round(r.months)} meses. Priorizar cierre de ronda en ${f.timelineMonths} meses.`;
    case "board-advisor-ai":
      return `Investor readiness ${snapshot.investorReadiness.score}%. Siguiente paso: ${snapshot.investorReadiness.recommendedNextStep}.`;
    case "market-intelligence-ai":
      return `Market score ${snapshot.marketScore.score}/100. Sector ${snapshot.benchmarks.sector}.`;
    default:
      return "Análisis pendiente.";
  }
}

export function runHeuristicCapitalDepartments(
  inputs: VentureFinancialInputs,
  snapshot: VentureIntelligenceSnapshot
): CapitalAiDepartmentResult[] {
  const ids: CapitalAiDepartmentId[] = [
    "investment-ai",
    "finance-ai",
    "growth-ai",
    "capital-ai",
    "board-advisor-ai",
    "market-intelligence-ai",
  ];

  return ids.map((departmentId) => ({
    departmentId,
    departmentName: DEPARTMENT_NAMES[departmentId],
    insight: heuristicInsight(departmentId, snapshot),
    confidence: 0.75,
    mode: "heuristic" as const,
    disclaimer: HEURISTIC_DISCLAIMER,
  }));
}
