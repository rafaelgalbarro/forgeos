import type { VentureProject } from "@/lib/domain/venture";
import { buildCEOBriefing as buildPortfolioBriefing } from "@/lib/portfolio/ceo-briefing";
import type { CEOBriefing } from "@/lib/portfolio/types";
import { countPriorityActions, resolvePortfolioNextAction } from "@/lib/portfolio/next-action";

export { runCeoEngine, type CeoEngineOutput } from "./ceo-engine";
export { buildMorningBrief, buildWeeklyReview, buildMonthlyReview } from "./daily-briefing";
export type { MorningBrief, WeeklyReview, MonthlyReview } from "./daily-briefing";
export { buildCeoExecutiveSummary } from "./executive-summary";
export type { CeoExecutiveSummary } from "./executive-summary";
export { buildCeoRecommendation } from "./recommendation-engine";
export type { CeoRecommendation } from "./recommendation-engine";
export { analyzeCriticalRisks } from "./risk-analysis";
export type { CriticalRisk } from "./risk-analysis";
export { identifyTopOpportunities } from "./opportunity-engine";
export type { TopOpportunity } from "./opportunity-engine";
export { reviewVenture, reviewAllVentures } from "./venture-review";
export type { VentureReview } from "./venture-review";
export { resolveCeoTopPriority, resolveCeoPriorityQueue } from "./priority";
export type { CeoPriorityItem } from "./priority";
export { readCeoMemory, recordBriefing, recordReview } from "./memory";

/** CEO briefing — heuristic today, AI-ready interface tomorrow. */
export function buildCEOBriefing(ventures: VentureProject[]): CEOBriefing {
  return buildPortfolioBriefing(ventures);
}

export interface DailyReport {
  date: string;
  headline: string;
  highlights: string[];
  priorityCount: number;
}

export function buildDailyReport(ventures: VentureProject[]): DailyReport {
  const priorities = countPriorityActions(ventures);
  const highlights: string[] = [];

  if (ventures.length === 0) {
    highlights.push("Portfolio vacío — momento ideal para capturar una nueva idea.");
  } else {
    const withResearch = ventures.filter((v) => v.researchReport).length;
    if (withResearch > 0) {
      highlights.push(`${withResearch} startup${withResearch > 1 ? "s" : ""} con Research completado.`);
    }
    const building = ventures.filter((v) => v.status === "building").length;
    if (building > 0) {
      highlights.push(`${building} en fase de Build activo.`);
    }
  }

  return {
    date: new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    headline: `Hoy hay ${priorities} decisión${priorities > 1 ? "es" : ""} que pueden acelerar tu portfolio.`,
    highlights,
    priorityCount: priorities,
  };
}

export interface ExecutivePriority {
  rank: number;
  ventureName: string;
  action: string;
  impact: string;
  href: string;
}

export function buildPriorityQueue(ventures: VentureProject[]): ExecutivePriority[] {
  const next = resolvePortfolioNextAction(ventures);
  if (!next) return [];

  return [
    {
      rank: 1,
      ventureName: next.ventureName,
      action: next.label,
      impact: next.impact,
      href: next.href,
    },
  ];
}

export interface ExecutiveSummary {
  portfolioSize: number;
  activeVentures: number;
  topPriority: string;
  ceoMessage: string;
}

export function buildExecutiveSummary(ventures: VentureProject[]): ExecutiveSummary {
  const next = resolvePortfolioNextAction(ventures);
  const active = ventures.filter(
    (v) => v.status === "intelligence" || v.status === "building" || v.status === "ready"
  ).length;

  return {
    portfolioSize: ventures.length,
    activeVentures: active,
    topPriority: next?.label ?? "Crear primera empresa",
    ceoMessage:
      ventures.length === 0
        ? "Tu venture studio está listo. El primer paso es capturar una idea."
        : "Tu equipo sigue trabajando. Cierra la siguiente decisión con mayor impacto.",
  };
}
