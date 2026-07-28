/** PROGRAM 5800 — Composite investor readiness scorer. */

import type {
  DataRoomDoc,
  DeckSlide,
  DDChecklistItem,
  FAQItem,
  FinancialModel,
  FundingPlan,
  InvestorReadinessScore,
  ValuationSummary,
  VentureIntelligenceContext,
} from "./types";
import { HEURISTIC_DISCLAIMER } from "@/lib/venture-intelligence";

function docScore(docs: DataRoomDoc[]): number {
  if (!docs.length) return 0;
  const w = { ready: 100, partial: 50, missing: 0 };
  return Math.round(docs.reduce((s, d) => s + w[d.status], 0) / docs.length);
}

function ddScore(items: DDChecklistItem[]): number {
  if (!items.length) return 0;
  const w = { ready: 100, partial: 50, missing: 0 };
  return Math.round(items.reduce((s, i) => s + w[i.status], 0) / items.length);
}

function deckScore(slides: DeckSlide[]): number {
  return Math.min(100, slides.length >= 8 ? 85 : slides.length * 10);
}

function financialScore(model: FinancialModel): number {
  const hasProjections = model.projections.length >= 3;
  const hasAssumptions = model.assumptions.length >= 3;
  const runwayOk = model.runwayMonths >= 6;
  let score = 40;
  if (hasProjections) score += 25;
  if (hasAssumptions) score += 15;
  if (runwayOk) score += 20;
  return Math.min(100, score);
}

function valuationScore(val: ValuationSummary): number {
  return val.amountEur > 0 && val.factors.length >= 3 ? 75 : 40;
}

function faqScore(items: FAQItem[]): number {
  return Math.min(100, items.length * 10);
}

function fundingScore(plan: FundingPlan): number {
  let score = 30;
  if (plan.useOfFunds.length >= 4) score += 25;
  if (plan.targetInvestors.length >= 3) score += 20;
  if (plan.milestones.length >= 4) score += 25;
  return Math.min(100, score);
}

function viScore(ctx: VentureIntelligenceContext): number {
  const scores = [
    ctx.investorReadinessScore,
    ctx.intelligenceScore,
    ctx.e2eInvestorScore,
    ctx.founderReadinessScore,
  ].filter((s): s is number => s !== undefined);
  if (!scores.length) return ctx.investorReadinessScore;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function computeInvestorReadinessScore(
  dataRoom: DataRoomDoc[],
  deck: DeckSlide[],
  financialModel: FinancialModel,
  valuation: ValuationSummary,
  dueDiligence: DDChecklistItem[],
  faq: FAQItem[],
  fundingPlan: FundingPlan,
  ctx: VentureIntelligenceContext
): InvestorReadinessScore {
  const breakdown = {
    dataRoom: docScore(dataRoom),
    deck: deckScore(deck),
    financialModel: financialScore(financialModel),
    valuation: valuationScore(valuation),
    dueDiligence: ddScore(dueDiligence),
    faq: faqScore(faq),
    fundingPlan: fundingScore(fundingPlan),
    ventureIntelligence: viScore(ctx),
  };

  const weights = {
    dataRoom: 0.15,
    deck: 0.1,
    financialModel: 0.12,
    valuation: 0.08,
    dueDiligence: 0.15,
    faq: 0.08,
    fundingPlan: 0.12,
    ventureIntelligence: 0.2,
  };

  const score = Math.round(
    Object.entries(weights).reduce(
      (sum, [key, w]) => sum + breakdown[key as keyof typeof breakdown] * w,
      0
    )
  );

  const gaps: string[] = [];
  if (breakdown.dataRoom < 60) gaps.push("Completar data room (legal, finanzas, producto)");
  if (breakdown.dueDiligence < 60) gaps.push("Resolver items DD de alta prioridad");
  if (breakdown.financialModel < 60) gaps.push("Refinar modelo financiero 3 años");
  if (breakdown.deck < 70) gaps.push("Finalizar pitch deck inversor");
  if (breakdown.ventureIntelligence < 65) gaps.push("Mejorar métricas Venture Intelligence");

  const recommendedNextStep =
    gaps.length > 0 ? gaps[0] : "Iniciar outreach a inversores target";

  return {
    score,
    breakdown,
    gaps,
    recommendedNextStep,
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
