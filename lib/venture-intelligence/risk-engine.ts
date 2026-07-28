/** RC8 — Risk engine (heuristic, dry-run). */

import type { RiskItem, RiskResult, VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";
import { calculateRunway } from "./runway-engine";

export function analyzeRisks(inputs: VentureFinancialInputs): RiskResult {
  const risks: RiskItem[] = [];
  const runway = calculateRunway(inputs);

  risks.push({
    id: "risk-market",
    category: "mercado",
    severity: inputs.marketSizeTAM && inputs.marketSizeTAM < 200_000_000 ? "high" : "medium",
    label: "Competencia y timing de mercado",
    mitigation: "Diferenciación clara y validación continua",
  });

  risks.push({
    id: "risk-traction",
    category: "tracción",
    severity: inputs.mrrGrowthRatePct < 8 ? "high" : "medium",
    label: "Velocidad de adquisición de clientes",
    mitigation: "Iterar GTM y medir cohortes",
  });

  risks.push({
    id: "risk-costs",
    category: "costes",
    severity: runway.months < 12 ? "high" : "medium",
    label: "Presión de burn y runway",
    mitigation: "Plan de financiación y control de gastos",
  });

  if (inputs.churnRatePct != null && inputs.churnRatePct > 8) {
    risks.push({
      id: "risk-churn",
      category: "retención",
      severity: "high",
      label: "Churn elevado",
      mitigation: "Programa de retención y CS proactivo",
    });
  }

  const severityWeight: Record<RiskItem["severity"], number> = { high: 3, medium: 2, low: 1 };
  const totalWeight = risks.reduce((s, r) => s + severityWeight[r.severity], 0);
  const overallScore = Math.max(0, 100 - totalWeight * 12);

  const topRisks = risks
    .sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity])
    .slice(0, 3)
    .map((r) => r.category);

  return {
    overallScore,
    risks,
    topRisks,
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
