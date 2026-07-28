import type { VentureProject } from "@/lib/domain/venture";
import {
  runVentureSimulator,
  ventureToSimulatorInput,
} from "@/lib/venture-simulator";
import { resolveScores, sectionHasContent } from "@/lib/portfolio/venture-status";
import type { PortfolioHealthSnapshot, VentureHealthCategory, VentureHealthItem } from "./types";

const CATEGORY_LABELS: Record<VentureHealthCategory, string> = {
  healthy: "Sana",
  "at-risk": "En riesgo",
  blocked: "Bloqueada",
  operating: "Operando",
  scaling: "Escalando",
};

function classifyVenture(venture: VentureProject): VentureHealthItem {
  const scores = resolveScores(venture);
  const remaining = venture.discoveryContext?.remainingQuestions?.length ?? 0;
  const sim =
    venture.ventureSimulatorResult ??
    runVentureSimulator(ventureToSimulatorInput(venture));

  let category: VentureHealthCategory = "healthy";
  let reason = "Avance coherente con el pipeline.";

  if (remaining > 0) {
    category = "blocked";
    reason = "Discovery sin cerrar bloquea el equipo.";
  } else if (sim?.recommendation === "do_not_build_yet" || sim?.recommendation === "pivot") {
    category = "at-risk";
    reason = "El simulador recomienda replantear la estrategia.";
  } else if (scores.ventureScore !== null && scores.ventureScore < 45 && scores.hasSimulation) {
    category = "at-risk";
    reason = "Venture Score bajo — wedge poco diferenciado.";
  } else if (sectionHasContent(venture, "landing") && (scores.ventureScore ?? 0) >= 70) {
    category = "scaling";
    reason = "Lista para escalar con tracción potencial.";
  } else if (venture.status === "ready" && venture.productPRD) {
    category = "operating";
    reason = "Operando con PRD y workspace activo.";
  } else if (!venture.researchReport) {
    category = "at-risk";
    reason = "Research pendiente aumenta incertidumbre.";
  }

  return {
    ventureId: venture.id,
    ventureName: venture.name,
    category,
    categoryLabel: CATEGORY_LABELS[category],
    reason,
  };
}

export function buildPortfolioHealthSnapshot(
  ventures: VentureProject[]
): PortfolioHealthSnapshot {
  const items = ventures.map(classifyVenture);

  const count = (cat: VentureHealthCategory) =>
    items.filter((i) => i.category === cat).length;

  return {
    healthy: count("healthy"),
    atRisk: count("at-risk"),
    blocked: count("blocked"),
    operating: count("operating"),
    scaling: count("scaling"),
    items,
  };
}

export function getVentureHealth(
  venture: VentureProject
): VentureHealthItem {
  return classifyVenture(venture);
}
