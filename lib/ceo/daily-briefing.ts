import type { VentureProject } from "@/lib/domain/venture";
import { buildCEOBriefing } from "@/lib/portfolio/ceo-briefing";
import type { CEOBriefing } from "@/lib/portfolio/types";
import type { FosSnapshot } from "@/lib/fos";

export interface MorningBrief {
  type: "morning";
  date: string;
  briefing: CEOBriefing;
  dailyFocus: string;
  attentionScore: number;
}

export interface WeeklyReview {
  type: "weekly";
  weekLabel: string;
  headline: string;
  highlights: string[];
  venturesReviewed: number;
  momentum: number;
}

export interface MonthlyReview {
  type: "monthly";
  monthLabel: string;
  headline: string;
  portfolioGrowth: number;
  readiness: number;
  summary: string;
}

export function buildMorningBrief(
  ventures: VentureProject[],
  fos: FosSnapshot
): MorningBrief {
  return {
    type: "morning",
    date: new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }),
    briefing: buildCEOBriefing(ventures),
    dailyFocus: fos.metrics.dailyFocus,
    attentionScore: fos.metrics.attentionScore,
  };
}

export function buildWeeklyReview(
  ventures: VentureProject[],
  fos: FosSnapshot
): WeeklyReview {
  const highlights: string[] = [];
  const withResearch = ventures.filter((v) => v.researchReport).length;
  const building = ventures.filter((v) => v.status === "building").length;

  if (withResearch > 0) highlights.push(`${withResearch} venture${withResearch > 1 ? "s" : ""} con Research completado.`);
  if (building > 0) highlights.push(`${building} en fase de Build activo.`);
  if (ventures.length === 0) highlights.push("Portfolio vacío — captura tu primera idea.");

  return {
    type: "weekly",
    weekLabel: `Semana ${Math.ceil(new Date().getDate() / 7)}`,
    headline: `Portfolio con momentum ${fos.metrics.momentum}% — ${ventures.length} startup${ventures.length !== 1 ? "s" : ""} activa${ventures.length !== 1 ? "s" : ""}.`,
    highlights,
    venturesReviewed: ventures.length,
    momentum: fos.metrics.momentum,
  };
}

export function buildMonthlyReview(
  ventures: VentureProject[],
  fos: FosSnapshot
): MonthlyReview {
  return {
    type: "monthly",
    monthLabel: new Date().toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
    headline: `Crecimiento del portfolio: ${fos.metrics.portfolioGrowth}%`,
    portfolioGrowth: fos.metrics.portfolioGrowth,
    readiness: fos.metrics.portfolioReadiness,
    summary:
      ventures.length === 0
        ? "Mes sin ventures — el siguiente paso es capturar una idea."
        : `Salud del portfolio al ${fos.metrics.portfolioHealth}% con ${ventures.length} venture${ventures.length > 1 ? "s" : ""} en curso.`,
  };
}
