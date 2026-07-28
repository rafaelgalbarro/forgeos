/** Rank pending decisions by impact and urgency. */

import type { PendingDecision } from "@/lib/mission-control/types";
import type { MissionContext, Risk } from "./types";

const CATEGORY_WEIGHT: Record<string, number> = {
  ARCHITECTURE: 90,
  BRANDING: 85,
  PRICING: 80,
  DEPLOYMENT: 70,
  DOMAIN: 60,
};

const IMPORTANT_BONUS = 25;

export function prioritizeDecisions(
  decisions: PendingDecision[],
  ctx: MissionContext,
  risks: Risk[]
): PendingDecision[] {
  const pending = decisions.filter((d) => !d.resolved);
  if (pending.length <= 1) return decisions;

  const riskCategories = new Set(
    risks
      .filter((r) => r.severity === "high" || r.severity === "critical")
      .map((r) => r.title.toLowerCase())
  );

  const scored = pending.map((d) => ({
    decision: d,
    score: scoreDecision(d, ctx, riskCategories),
  }));

  scored.sort((a, b) => b.score - a.score);
  const prioritizedPending = scored.map((s) => s.decision);
  const resolved = decisions.filter((d) => d.resolved);

  return [...prioritizedPending, ...resolved];
}

function scoreDecision(
  d: PendingDecision,
  ctx: MissionContext,
  riskCategories: Set<string>
): number {
  let score = CATEGORY_WEIGHT[d.category] ?? 50;
  if (d.important) score += IMPORTANT_BONUS;

  if (ctx.phase === "BUILD" && d.category === "ARCHITECTURE") score += 20;
  if (ctx.phase === "PLAN" && d.category === "BRANDING") score += 15;
  if (ctx.phase === "DEPLOY" && d.category === "DEPLOYMENT") score += 20;

  if (riskCategories.has(d.title.toLowerCase())) score += 10;

  return score;
}

export function topDecisionTitle(decisions: PendingDecision[]): string | undefined {
  const next = decisions.find((d) => !d.resolved);
  return next?.title;
}

export function buildPriorityList(decisions: PendingDecision[], ctx: MissionContext): string[] {
  const pending = decisions.filter((d) => !d.resolved);
  const list: string[] = [];

  for (const d of pending.slice(0, 3)) {
    const weight = CATEGORY_WEIGHT[d.category] ?? 50;
    list.push(`${d.title} (prioridad ${weight}${d.important ? ", crítica" : ""})`);
  }

  if (ctx.phase === "PLAN") list.push("Completar plan antes de BUILD");
  if (ctx.phase === "VALIDATE") list.push("Validar con usuarios reales");

  return list.slice(0, 4);
}
