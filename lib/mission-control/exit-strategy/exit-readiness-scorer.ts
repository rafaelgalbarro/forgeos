/** Composite exit readiness score (0-100). */

import type { Mission } from "../types";
import type { ExitReadiness, ExitStrategyType, ReadinessDimension } from "./types";
import { getExitStrategyConfig } from "./exit-strategy-registry";
import { readVentureMemory } from "../pair-founder/venture-memory";

function phaseProgress(phase: Mission["phase"]): number {
  const order = ["UNDERSTAND", "PLAN", "BUILD", "VALIDATE", "DEPLOY", "OPERATE", "EVOLVE"];
  const idx = order.indexOf(phase);
  return Math.round(((idx + 1) / order.length) * 100);
}

function snapshotAvg(mission: Mission, domains: string[]): number {
  const snaps = mission.snapshots.filter((s) => domains.includes(s.id));
  if (!snaps.length) return 0;
  return Math.round(snaps.reduce((sum, s) => sum + s.progress, 0) / snaps.length);
}

function strategySpecificDimensions(
  strategy: ExitStrategyType,
  mission: Mission
): ReadinessDimension[] {
  const config = getExitStrategyConfig(strategy);
  const memory = readVentureMemory(mission.id);
  const phaseScore = phaseProgress(mission.phase);

  const dimensions: ReadinessDimension[] = [];

  switch (strategy) {
    case "venta":
      dimensions.push(
        { id: "traction", label: "Tracción", score: snapshotAvg(mission, ["marketing", "financials"]), maxScore: 100, note: "Métricas de crecimiento y retención" },
        { id: "dd-ready", label: "Due diligence", score: snapshotAvg(mission, ["investorReadiness", "financials"]), maxScore: 100, note: "Data room y documentación" },
        { id: "moat", label: "Ventaja competitiva", score: snapshotAvg(mission, ["research", "prd"]), maxScore: 100, note: "Diferenciación demostrable" }
      );
      break;
    case "crecimiento_independiente":
      dimensions.push(
        { id: "unit-econ", label: "Unit economics", score: snapshotAvg(mission, ["financials", "businessModel"]), maxScore: 100, note: "LTV/CAC y márgenes" },
        { id: "efficiency", label: "Eficiencia", score: Math.min(100, phaseScore + snapshotAvg(mission, ["architecture"]) / 2), maxScore: 100, note: "Operaciones lean" },
        { id: "organic", label: "Crecimiento orgánico", score: snapshotAvg(mission, ["marketing"]), maxScore: 100, note: "Adquisición sin capital externo" }
      );
      break;
    case "dividendos":
      dimensions.push(
        { id: "margins", label: "Márgenes", score: snapshotAvg(mission, ["financials"]), maxScore: 100, note: "Rentabilidad sostenible" },
        { id: "retention", label: "Retención", score: snapshotAvg(mission, ["marketing", "businessModel"]), maxScore: 100, note: "Churn bajo y base estable" },
        { id: "stability", label: "Estabilidad", score: phaseScore, maxScore: 100, note: "Operaciones predecibles" }
      );
      break;
    case "venture_capital":
      dimensions.push(
        { id: "fundraising", label: "Fundraising", score: snapshotAvg(mission, ["investorReadiness", "financials"]), maxScore: 100, note: "Deck, data room y narrativa" },
        { id: "growth", label: "Crecimiento", score: snapshotAvg(mission, ["marketing", "research"]), maxScore: 100, note: "Velocidad de tracción" },
        { id: "tam", label: "Mercado", score: snapshotAvg(mission, ["research", "businessModel"]), maxScore: 100, note: "TAM y posicionamiento" }
      );
      break;
    case "patrimonio_familiar":
      dimensions.push(
        { id: "governance", label: "Gobernanza", score: Math.min(100, phaseScore + (memory.strategyNotes.length > 2 ? 20 : 0)), maxScore: 100, note: "Estructura y plan documentado" },
        { id: "brand", label: "Marca duradera", score: snapshotAvg(mission, ["brand", "marketing"]), maxScore: 100, note: "Reputación y legado" },
        { id: "succession", label: "Sucesión", score: Math.min(100, memory.priorDecisions.length * 10), maxScore: 100, note: "Decisiones y transferencia" }
      );
      break;
  }

  return dimensions;
}

function computeGaps(dimensions: ReadinessDimension[], config: ReturnType<typeof getExitStrategyConfig>): string[] {
  const gaps: string[] = [];
  for (const dim of dimensions) {
    if (dim.score < 40) gaps.push(`${dim.label}: ${dim.note} (${dim.score}%)`);
  }
  for (const kpi of config.primaryKPIs) {
    const weakest = dimensions.sort((a, b) => a.score - b.score)[0];
    if (weakest && weakest.score < 50) {
      gaps.push(`KPI "${kpi.label}": objetivo ${kpi.target}`);
    }
    break;
  }
  return [...new Set(gaps)].slice(0, 4);
}

export function computeExitReadiness(mission: Mission, strategy: ExitStrategyType): ExitReadiness {
  const config = getExitStrategyConfig(strategy);
  const dimensions = strategySpecificDimensions(strategy, mission);
  const score = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);
  const gaps = computeGaps(dimensions, config);

  const nextSteps: Record<ExitStrategyType, string> = {
    venta: "Completa data room y acelera métricas de tracción para due diligence.",
    crecimiento_independiente: "Valida unit economics positivos antes de escalar marketing.",
    dividendos: "Estabiliza márgenes y define política de distribución de beneficios.",
    venture_capital: "Prepara deck y data room; acelera crecimiento MoM demostrable.",
    patrimonio_familiar: "Documenta gobernanza y plan de sucesión generacional.",
  };

  return {
    score,
    strategy,
    dimensions,
    gaps,
    recommendedNextStep: nextSteps[strategy],
    computedAt: new Date().toISOString(),
  };
}
