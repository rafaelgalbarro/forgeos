import type { VentureProject } from "@/lib/domain/venture";
import type { PortfolioMetric } from "./types";
import { resolveScores } from "./venture-status";

function isValidatedIdea(venture: VentureProject): boolean {
  const discoveryOk = (venture.discoveryContext?.answers.length ?? 0) >= 2;
  const researchOk = !!venture.researchReport;
  const scores = resolveScores(venture);
  const scoreOk = scores.startupScore >= 45;
  return discoveryOk || researchOk || scoreOk;
}

function estimateHoursSaved(ventures: VentureProject[]): number {
  let total = 0;
  for (const v of ventures) {
    let hours = 1.5;
    if (v.discoveryContext?.answers.length) hours += 0.5;
    if (v.researchReport) hours += 3;
    if (v.productPRD) hours += 2.5;
    if (v.sections.length) hours += v.sections.length * 0.25;
    if (v.status === "ready") hours += 2;
    total += Math.round(hours);
  }
  return total;
}

function estimatePortfolioValue(ventures: VentureProject[]): {
  value: string;
  pending: boolean;
  microcopy?: string;
} {
  if (ventures.length === 0) {
    return {
      value: "Pendiente de valoración",
      pending: true,
      microcopy: "Completa Venture Simulator para calcular el valor estimado del portfolio.",
    };
  }

  let hasRealSimulation = false;
  let total = 0;

  for (const v of ventures) {
    const { ventureScore, startupScore, hasSimulation } = resolveScores(v);
    if (hasSimulation && ventureScore !== null && ventureScore > 0) {
      hasRealSimulation = true;
      total += ventureScore * 420;
    } else if (startupScore > 0) {
      total += startupScore * 280;
    }
  }

  if (!hasRealSimulation) {
    return {
      value: "Pendiente de valoración",
      pending: true,
      microcopy: "Completa Venture Simulator para calcular el valor estimado del portfolio.",
    };
  }

  if (total >= 1_000_000) {
    return { value: `€${(total / 1_000_000).toFixed(1)}M`, pending: false };
  }
  if (total >= 1_000) {
    return { value: `€${Math.round(total / 1_000)}K`, pending: false };
  }
  if (total > 0) {
    return { value: `€${total}`, pending: false };
  }

  return {
    value: "Calculando…",
    pending: true,
    microcopy: "Se calculará cuando completes Venture Simulator.",
  };
}

function countActiveStartups(ventures: VentureProject[]): number {
  return ventures.filter(
    (v) => v.status === "intelligence" || v.status === "building" || v.status === "ready"
  ).length;
}

export function buildPortfolioMetrics(ventures: VentureProject[]): PortfolioMetric[] {
  const validated = ventures.filter(isValidatedIdea).length;
  const active = countActiveStartups(ventures);
  const hours = estimateHoursSaved(ventures);
  const portfolioValue = estimatePortfolioValue(ventures);

  return [
    {
      id: "portfolio-value",
      title: "Portfolio Value",
      value: portfolioValue.value,
      explanation: portfolioValue.pending
        ? "Valor estimado del portfolio"
        : "Valor estimado heurístico del portfolio",
      trend: ventures.length > 0 ? `${ventures.length} venture${ventures.length > 1 ? "s" : ""}` : undefined,
      pending: portfolioValue.pending,
      microcopy: portfolioValue.microcopy,
    },
    {
      id: "active-startups",
      title: "Startups activas",
      value: String(active),
      explanation: "Empresas en Idea, Validación o Build",
      trend: active > 0 ? "En construcción" : "Sin ventures activos",
      microcopy:
        active > 0
          ? "Cada startup activa consume foco. Prioriza las de mayor impacto."
          : "Crea tu primera empresa para empezar.",
    },
    {
      id: "validated-ideas",
      title: "Ideas validadas",
      value: ventures.length === 0 ? "Pendiente" : String(validated),
      explanation: "Con Discovery, Research o score suficiente",
      trend:
        validated > 0
          ? `${validated} lista${validated > 1 ? "s" : ""} para avanzar`
          : "Completa Discovery",
      pending: ventures.length === 0,
      microcopy:
        validated > 0
          ? "Ideas con señales suficientes para decidir Build."
          : "Valida con Discovery o Research antes de construir.",
    },
    {
      id: "time-saved",
      title: "Tiempo ahorrado",
      value: hours > 0 ? `${hours}h` : "Pendiente",
      explanation: "Estimación vs. proceso manual",
      trend: hours >= 8 ? "Semana recuperada" : "Acumulando valor",
      pending: hours === 0,
      microcopy:
        hours > 0
          ? "ForgeOS trabaja por ti mientras no estás."
          : "ForgeOS trabaja por ti mientras no estás.",
    },
  ];
}

export function countImportantDecisions(ventures: VentureProject[]): number {
  if (ventures.length === 0) return 1;

  let count = 0;
  for (const v of ventures) {
    const remaining = v.discoveryContext?.remainingQuestions?.length ?? 0;
    const answered = v.discoveryContext?.answers.length ?? 0;
    if (remaining > 0 || answered < 2) count += 1;
    if (!v.researchReport && v.status !== "building") count += 1;
    const { ventureScore, hasSimulation } = resolveScores(v);
    if (hasSimulation && ventureScore !== null && ventureScore < 45) count += 1;
  }
  return Math.min(Math.max(count, 1), 9);
}

export function countStartupsInProgress(ventures: VentureProject[]): number {
  return ventures.filter((v) => v.status !== "ready" || !v.productPRD).length || ventures.length;
}
