/** Portfolio venture ranking for CEO Office (Epic 3.2). */

import type { VentureProject } from "@/lib/domain/venture";
import { resolveNextAction } from "@/lib/portfolio/next-action";
import { resolveScores } from "@/lib/portfolio/venture-status";

export interface VentureRanking {
  ventureId: string;
  name: string;
  priority: number;
  expectedRoi: number;
  risk: number;
  timeToValue: number;
  confidence: number;
  href: string;
}

export interface PortfolioHighlights {
  topVenture: VentureRanking | null;
  mostCritical: VentureRanking | null;
  mostPromising: VentureRanking | null;
  needsAttention: VentureRanking | null;
  rankings: VentureRanking[];
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

function computeRanking(venture: VentureProject): VentureRanking {
  const scores = resolveScores(venture);
  const next = resolveNextAction(venture);
  const sim = venture.ventureSimulatorResult;
  const discoveryPct = Math.min(
    1,
    (venture.discoveryContext?.answers.length ?? 0) / 5
  );
  const researchBonus = venture.researchReport ? 0.15 : 0;
  const prdBonus = venture.productPRD ? 0.1 : 0;

  const ventureScore = scores.ventureScore ?? scores.startupScore;
  const priority =
    (ventureScore / 100) * 0.4 +
    discoveryPct * 0.2 +
    researchBonus +
    prdBonus +
    (next.priority === "alta" ? 0.15 : next.priority === "media" ? 0.08 : 0);

  const expectedRoi = Math.min(
    100,
    ventureScore * 0.6 + (sim?.startupScore ?? scores.startupScore) * 0.4
  );

  let risk = 50;
  if (!venture.researchReport) risk += 20;
  if ((venture.discoveryContext?.remainingQuestions.length ?? 0) > 0) risk += 15;
  if (sim?.recommendation === "pivot") risk += 25;
  if (sim?.recommendation === "research_more") risk += 10;
  risk = Math.min(100, Math.max(0, risk));

  let timeToValue = 90;
  if (venture.status === "building") timeToValue = 30;
  else if (venture.productPRD) timeToValue = 45;
  else if (venture.researchReport) timeToValue = 60;
  timeToValue += daysSince(venture.updatedAt) > 14 ? 10 : 0;

  const confidenceMap = { alta: 0.85, media: 0.65, baja: 0.45 };
  const confidence =
    scores.confidence === "alta"
      ? confidenceMap.alta
      : scores.confidence === "media"
        ? confidenceMap.media
        : confidenceMap.baja;

  return {
    ventureId: venture.id,
    name: venture.name,
    priority: Math.round(priority * 100) / 100,
    expectedRoi: Math.round(expectedRoi),
    risk: Math.round(risk),
    timeToValue: Math.round(timeToValue),
    confidence: Math.round(confidence * 100) / 100,
    href: `/venture/${venture.id}`,
  };
}

export function rankPortfolioVentures(ventures: VentureProject[]): VentureRanking[] {
  return [...ventures]
    .map(computeRanking)
    .sort((a, b) => b.priority - a.priority);
}

export function getPortfolioHighlights(ventures: VentureProject[]): PortfolioHighlights {
  const rankings = rankPortfolioVentures(ventures);
  if (rankings.length === 0) {
    return {
      topVenture: null,
      mostCritical: null,
      mostPromising: null,
      needsAttention: null,
      rankings: [],
    };
  }

  const topVenture = rankings[0];
  const mostCritical = [...rankings].sort((a, b) => b.risk - a.risk)[0];
  const mostPromising = [...rankings].sort((a, b) => b.expectedRoi - a.expectedRoi)[0];
  const needsAttention = [...rankings].sort(
    (a, b) => a.confidence - b.confidence || b.risk - a.risk
  )[0];

  return { topVenture, mostCritical, mostPromising, needsAttention, rankings };
}
