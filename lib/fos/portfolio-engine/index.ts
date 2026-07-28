import type { VentureProject } from "@/lib/domain/venture";
import { buildPortfolioHealthSnapshot } from "@/lib/health";
import { resolveScores } from "@/lib/portfolio/venture-status";
import { resolveAllLifecycleStates } from "../lifecycle-engine";
import type { FosMetrics } from "../types";

function clamp(n: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, n));
}

export function computePortfolioHealthScore(ventures: VentureProject[]): number {
  if (ventures.length === 0) return 0;
  const snapshot = buildPortfolioHealthSnapshot(ventures);
  const total = ventures.length;
  const healthy = snapshot.healthy + snapshot.operating + snapshot.scaling;
  const atRisk = snapshot.atRisk + snapshot.blocked;
  return clamp(Math.round((healthy / total) * 70 + (1 - atRisk / total) * 30));
}

export function computePortfolioGrowth(ventures: VentureProject[]): number {
  if (ventures.length === 0) return 0;
  const recent = ventures.filter((v) => {
    const days = (Date.now() - new Date(v.createdAt).getTime()) / 86_400_000;
    return days <= 30;
  }).length;
  return clamp(Math.round((recent / ventures.length) * 100));
}

export function computePortfolioReadiness(ventures: VentureProject[]): number {
  if (ventures.length === 0) return 0;
  const states = resolveAllLifecycleStates(ventures);
  const ready = states.filter(
    (s) => s.stage === "ready" || s.stage === "scaling" || s.stage === "building"
  ).length;
  return clamp(Math.round((ready / ventures.length) * 100));
}

export function computeImpactScore(ventures: VentureProject[]): number {
  if (ventures.length === 0) return 0;
  let total = 0;
  for (const v of ventures) {
    const scores = resolveScores(v);
    total += scores.startupScore;
    if (scores.ventureScore !== null) total += scores.ventureScore * 0.5;
  }
  return clamp(Math.round(total / ventures.length));
}

export function computeMomentum(ventures: VentureProject[]): number {
  if (ventures.length === 0) return 0;
  const recent = ventures.filter((v) => {
    const days = (Date.now() - new Date(v.updatedAt).getTime()) / 86_400_000;
    return days <= 7;
  }).length;
  const withProgress = ventures.filter(
    (v) => v.researchReport || v.productPRD || v.sections.length > 3
  ).length;
  return clamp(Math.round((recent / ventures.length) * 50 + (withProgress / ventures.length) * 50));
}

export function computeConfidence(ventures: VentureProject[]): number {
  if (ventures.length === 0) return 0;
  let total = 0;
  for (const v of ventures) {
    const scores = resolveScores(v);
    const confMap = { alta: 90, media: 60, baja: 30 };
    total += confMap[scores.confidence] ?? 50;
  }
  return clamp(Math.round(total / ventures.length));
}

export function computeRisk(ventures: VentureProject[]): number {
  if (ventures.length === 0) return 0;
  const snapshot = buildPortfolioHealthSnapshot(ventures);
  const total = ventures.length;
  const riskCount = snapshot.atRisk + snapshot.blocked;
  return clamp(Math.round((riskCount / total) * 100));
}

export function computePortfolioMetrics(ventures: VentureProject[]): FosMetrics {
  return {
    dailyFocus: ventures.length > 0 ? ventures[0].name : "Capturar primera idea",
    attentionScore: clamp(ventures.length > 0 ? 75 : 20),
    portfolioHealth: computePortfolioHealthScore(ventures),
    portfolioGrowth: computePortfolioGrowth(ventures),
    portfolioReadiness: computePortfolioReadiness(ventures),
    impactScore: computeImpactScore(ventures),
    momentum: computeMomentum(ventures),
    confidence: computeConfidence(ventures),
    risk: computeRisk(ventures),
  };
}
