/** PROGRAM 5150 — Validation phase (reuses existing modules via adapters). */

import type { MissionSession, MissionValidationScores } from "./types";

export interface ValidationResult {
  scores: MissionValidationScores;
  summary: string;
  findings: string[];
}

/** On-demand validation — no heavy imports at module load */
export async function runValidationPhase(session: MissionSession): Promise<ValidationResult> {
  const idea = session.intent?.extractedIdea ?? "";
  const intent = session.intent?.primary;

  const [productScore, archScore, ventureScore] = await Promise.all([
    loadProductValidationScore(idea),
    loadArchitectureScore(),
    loadVentureIntelligenceScore(idea),
  ]);

  const marketScore = heuristicMarketScore(idea);
  const riskScore = heuristicRiskScore(idea);
  const mvpReadiness = Math.round((productScore + archScore + ventureScore) / 3);
  const launchReadiness = Math.round((mvpReadiness + marketScore) / 2);
  const investorReadiness = Math.round((ventureScore + marketScore + mvpReadiness) / 3);

  const scores: MissionValidationScores = {
    venture: ventureScore,
    product: productScore,
    technical: archScore,
    market: marketScore,
    risk: riskScore,
    mvpReadiness,
    launchReadiness,
    investorReadiness,
    source: "heuristic",
    generatedAt: new Date().toISOString(),
  };

  const findings = [
    `Product validation: ${productScore}% (heuristic)`,
    `Architecture review: ${archScore}% (heuristic)`,
    `Venture intelligence: ${ventureScore}% (heuristic)`,
    `QA checklist: pendiente de ejecución real`,
    `Security review: checklist generado`,
    `Legal/Finance: revisión demo`,
  ];

  const summary =
    `Validación completada (${scores.source}). ` +
    `Venture ${scores.venture}% · Product ${scores.product}% · Technical ${scores.technical}% · ` +
    `Market ${scores.market}% · Risk ${scores.risk}% · ` +
    `MVP ${scores.mvpReadiness}% · Launch ${scores.launchReadiness}% · Investor ${scores.investorReadiness}%. ` +
    `Sin acciones productivas — datos demo/heurísticos.`;

  return { scores, summary, findings };
}

async function loadProductValidationScore(idea: string): Promise<number> {
  return heuristicProductScore(idea);
}

async function loadArchitectureScore(): Promise<number> {
  try {
    const { reviewArchitecture, getArchitectureScore } = await import("@/lib/self-evolution/architecture-review");
    const findings = reviewArchitecture();
    return getArchitectureScore(findings);
  } catch {
    return 68;
  }
}

async function loadVentureIntelligenceScore(idea: string): Promise<number> {
  try {
    const { buildVentureIntelligenceSnapshot } = await import("@/lib/venture-intelligence");
    const snap = buildVentureIntelligenceSnapshot({
      ventureId: "preview",
      ventureName: idea.slice(0, 40) || "Venture",
      stage: "pre-seed",
      cashOnHand: 50000,
      monthlyBurn: 8000,
      monthlyRevenue: 0,
      mrrGrowthRatePct: 0,
      teamSize: 2,
      monthsOperating: 0,
    });
    return Math.min(95, Math.max(40, snap.ventureScore?.score ?? 70));
  } catch {
    return heuristicVentureScore(idea);
  }
}

function heuristicProductScore(idea: string): number {
  const keywords = ["plataforma", "gestionar", "incidencias", "facturación", "inventario"];
  const hits = keywords.filter((k) => idea.toLowerCase().includes(k)).length;
  return Math.min(90, 55 + hits * 6);
}

function heuristicVentureScore(idea: string): number {
  return idea.length > 30 ? 72 : 58;
}

function heuristicMarketScore(idea: string): number {
  const b2b = /empresa|b2b|mantenimiento|técnico/i.test(idea);
  return b2b ? 74 : 60;
}

function heuristicRiskScore(idea: string): number {
  const complex = /inventario|facturación|rutas|integración/i.test(idea);
  return complex ? 55 : 70;
}

export function formatValidationScores(scores: MissionValidationScores): string {
  return [
    `Venture: ${scores.venture}%`,
    `Product: ${scores.product}%`,
    `Technical: ${scores.technical}%`,
    `Market: ${scores.market}%`,
    `Risk: ${scores.risk}%`,
    `MVP: ${scores.mvpReadiness}%`,
    `Launch: ${scores.launchReadiness}%`,
    `Investor: ${scores.investorReadiness}%`,
    `(${scores.source})`,
  ].join(" · ");
}
