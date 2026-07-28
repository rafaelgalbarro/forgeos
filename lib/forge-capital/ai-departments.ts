/** RC8 — Forge Capital AI departments (heuristic by default). */

import { isRealAiEnabled } from "@/lib/ai-runtime/config";
import { executeOrchestrationAi } from "@/lib/ai-orchestration/runtime-adapter";
import type {
  CapitalAiDepartmentId,
  CapitalAiDepartmentResult,
  VentureFinancialInputs,
  VentureIntelligenceSnapshot,
} from "@/lib/venture-intelligence/types";
import { HEURISTIC_DISCLAIMER, PENDING_DATA_DISCLAIMER } from "@/lib/venture-intelligence/types";
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

export async function runCapitalAiDepartment(params: {
  departmentId: CapitalAiDepartmentId;
  inputs: VentureFinancialInputs;
  snapshot: VentureIntelligenceSnapshot;
}): Promise<CapitalAiDepartmentResult> {
  const { departmentId, inputs, snapshot } = params;
  const departmentName = DEPARTMENT_NAMES[departmentId];

  if (isRealAiEnabled()) {
    try {
      const result = await executeOrchestrationAi({
        task: "ceo-brief",
        system: `Eres ${departmentName} de ForgeOS Capital. Responde en español, máximo 2 frases. Marca estimaciones como heurísticas.`,
        user: `Venture: ${inputs.ventureName}. Valoración: ${snapshot.valuation.amountEur}. Runway: ${snapshot.runway.months} meses.`,
        department: departmentId,
        ventureContext: { ventureId: inputs.ventureId },
      });
      return {
        departmentId,
        departmentName,
        insight: result.output,
        confidence: result.confidence,
        mode: "real-ai",
        disclaimer: PENDING_DATA_DISCLAIMER,
      };
    } catch {
      // fall through to heuristic
    }
  }

  return {
    departmentId,
    departmentName,
    insight: heuristicInsight(departmentId, snapshot),
    confidence: 0.75,
    mode: "heuristic",
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}

export async function runAllCapitalAiDepartments(
  inputs: VentureFinancialInputs,
  snapshot: VentureIntelligenceSnapshot
): Promise<CapitalAiDepartmentResult[]> {
  const ids: CapitalAiDepartmentId[] = [
    "investment-ai",
    "finance-ai",
    "growth-ai",
    "capital-ai",
    "board-advisor-ai",
    "market-intelligence-ai",
  ];
  return Promise.all(
    ids.map((departmentId) => runCapitalAiDepartment({ departmentId, inputs, snapshot }))
  );
}
