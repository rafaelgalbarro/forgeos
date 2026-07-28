import type { VentureProject } from "@/lib/domain/venture";
import { buildPortfolioHealthSnapshot } from "@/lib/health";
import {
  runVentureSimulator,
  ventureToSimulatorInput,
} from "@/lib/venture-simulator";
import { resolveScores } from "@/lib/portfolio/venture-status";

export interface CriticalRisk {
  id: string;
  ventureName: string;
  severity: "high" | "medium" | "low";
  label: string;
  description: string;
}

export function analyzeCriticalRisks(ventures: VentureProject[]): CriticalRisk[] {
  if (ventures.length === 0) {
    return [{
      id: "empty-portfolio",
      ventureName: "Portfolio",
      severity: "medium",
      label: "Portfolio vacío",
      description: "Sin ventures no hay señales de mercado que priorizar.",
    }];
  }

  const risks: CriticalRisk[] = [];
  const health = buildPortfolioHealthSnapshot(ventures);

  for (const item of health.items) {
    if (item.category === "blocked" || item.category === "at-risk") {
      risks.push({
        id: `risk-${item.ventureId}`,
        ventureName: item.ventureName,
        severity: item.category === "blocked" ? "high" : "medium",
        label: item.categoryLabel,
        description: item.reason,
      });
    }
  }

  for (const v of ventures) {
    const sim =
      v.ventureSimulatorResult ?? runVentureSimulator(ventureToSimulatorInput(v));
    if (sim?.recommendation === "pivot" || sim?.recommendation === "do_not_build_yet") {
      risks.push({
        id: `sim-${v.id}`,
        ventureName: v.name,
        severity: "high",
        label: "Simulador en alerta",
        description: "El Venture Simulator recomienda replantear la estrategia.",
      });
    }
    const scores = resolveScores(v);
    if (scores.ventureScore !== null && scores.ventureScore < 45 && scores.hasSimulation) {
      risks.push({
        id: `score-${v.id}`,
        ventureName: v.name,
        severity: "medium",
        label: "Venture Score bajo",
        description: "La propuesta sigue siendo demasiado generalista.",
      });
    }
  }

  const seen = new Set<string>();
  return risks
    .filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    })
    .slice(0, 5);
}
