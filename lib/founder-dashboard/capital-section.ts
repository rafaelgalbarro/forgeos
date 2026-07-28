import type { VentureProject } from "@/lib/domain/venture";
import { buildInvestmentReadiness } from "@/lib/venture-workspace/investment-readiness";
import type { FounderCapitalSection, FounderCapitalMetric } from "./types";

function shortName(name: string): string {
  return name.length > 40 ? `${name.slice(0, 37)}…` : name;
}

function workspaceHref(venture: VentureProject): string {
  return `/venture/${venture.id}`;
}

function aggregateMetrics(ventures: VentureProject[]): FounderCapitalMetric[] {
  if (ventures.length === 0) return [];

  const buckets = new Map<string, { score: number; maxScore: number; label: string; details: string[] }>();

  for (const venture of ventures) {
    const readiness = buildInvestmentReadiness(venture);
    for (const m of readiness.metrics) {
      const existing = buckets.get(m.id) ?? {
        score: 0,
        maxScore: 0,
        label: m.label,
        details: [],
      };
      existing.score += m.score;
      existing.maxScore += m.maxScore;
      if (m.score > 0) existing.details.push(m.detail);
      buckets.set(m.id, existing);
    }
  }

  return Array.from(buckets.entries()).map(([id, b]) => {
    const ratio = b.maxScore > 0 ? b.score / b.maxScore : 0;
    const status = ratio >= 0.8 ? "ready" : ratio >= 0.4 ? "progress" : "pending";
    const uniqueDetails = [...new Set(b.details)].slice(0, 2).join(" · ");
    return {
      id,
      label: b.label,
      score: Math.round(b.score / ventures.length),
      maxScore: Math.round(b.maxScore / ventures.length),
      status,
      detail: uniqueDetails || "Pendiente en el portfolio",
    };
  });
}

export function buildFounderCapitalSection(ventures: VentureProject[]): FounderCapitalSection {
  if (ventures.length === 0) {
    return {
      portfolioScore: 0,
      portfolioLabel: "Captura tu primera empresa para evaluar preparación de capital",
      aggregateMetrics: [],
      ventures: [],
      headline: "Preparación para inversión",
    };
  }

  const ventureRows = ventures.map((v) => {
    const readiness = buildInvestmentReadiness(v);
    return {
      id: v.id,
      name: shortName(v.name),
      overallScore: readiness.overallScore,
      overallLabel: readiness.overallLabel,
      href: workspaceHref(v),
    };
  });

  const portfolioScore = Math.round(
    ventureRows.reduce((sum, v) => sum + v.overallScore, 0) / ventureRows.length
  );

  let portfolioLabel = "Etapa temprana — enfocar validación";
  if (portfolioScore >= 75) portfolioLabel = "Portfolio listo para conversaciones con inversores";
  else if (portfolioScore >= 50) portfolioLabel = "En preparación — completar piezas clave";
  else if (portfolioScore >= 30) portfolioLabel = "Progreso sólido — documentar y validar";

  const top = [...ventureRows].sort((a, b) => b.overallScore - a.overallScore)[0];
  const headline =
    top && top.overallScore >= 50
      ? `${top.name} lidera la preparación para capital`
      : "Preparación para inversión por empresa";

  return {
    portfolioScore,
    portfolioLabel,
    aggregateMetrics: aggregateMetrics(ventures),
    ventures: ventureRows,
    headline,
  };
}
