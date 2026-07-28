import type { VentureProject } from "@/lib/domain/venture";
import { resolveScores } from "@/lib/portfolio/venture-status";
import {
  runVentureSimulator,
  ventureToSimulatorInput,
} from "@/lib/venture-simulator";

export interface TopOpportunity {
  id: string;
  ventureName: string;
  label: string;
  description: string;
  potentialImpact: string;
  href: string;
}

export function identifyTopOpportunities(ventures: VentureProject[]): TopOpportunity[] {
  if (ventures.length === 0) return [];

  const opportunities: TopOpportunity[] = [];

  for (const v of ventures) {
    const scores = resolveScores(v);
    const sim =
      v.ventureSimulatorResult ?? runVentureSimulator(ventureToSimulatorInput(v));

    if (v.researchReport && !v.productPRD) {
      opportunities.push({
        id: `prd-${v.id}`,
        ventureName: v.name,
        label: "Generar PRD",
        description: "Research completado — listo para definir producto.",
        potentialImpact: "Desbloquea Build Plan y acelera desarrollo.",
        href: v.status === "ready" ? `/venture/${v.id}` : `/intelligence/${v.id}`,
      });
    }

    if (sim?.recommendation === "build" || sim?.recommendation === "build_small_mvp") {
      opportunities.push({
        id: `build-${v.id}`,
        ventureName: v.name,
        label: "Iniciar Build",
        description: "El simulador valida viabilidad — momento de construir.",
        potentialImpact: "Acerca validación con usuarios reales.",
        href: `/build/${v.id}`,
      });
    }

    if (scores.ventureScore !== null && scores.ventureScore >= 70) {
      opportunities.push({
        id: `scale-${v.id}`,
        ventureName: v.name,
        label: "Potencial de escala",
        description: "Venture Score alto — wedge diferenciado detectado.",
        potentialImpact: "Priorizar tracción y go-to-market.",
        href: `/venture/${v.id}`,
      });
    }
  }

  return opportunities.slice(0, 5);
}
