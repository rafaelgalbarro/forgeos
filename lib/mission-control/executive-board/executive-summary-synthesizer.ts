/** PROGRAM 5400 — Merge department reviews into one Executive Summary. */

import type { BoardTriggerContext, DepartmentReview, ExecutiveSummary } from "./types";
import { getParticipant } from "./board-participants";

export function synthesizeExecutiveSummary(
  reviews: DepartmentReview[],
  trigger: BoardTriggerContext
): ExecutiveSummary {
  const avgConfidence = Math.round(
    reviews.reduce((sum, r) => sum + r.confianza, 0) / Math.max(reviews.length, 1)
  );

  const highImpact = reviews.filter((r) => r.impacto === "high");
  const leadReview = highImpact[0] ?? reviews[0];

  const allRisks = dedupeStrings(reviews.flatMap((r) => r.riesgos)).slice(0, 6);
  const alternatives = buildAlternatives(reviews, trigger);

  const finalRecommendation = buildFinalRecommendation(reviews, trigger, leadReview);

  return {
    finalRecommendation,
    alternatives,
    risks: allRisks,
    confidence: avgConfidence,
    headline: "Resumen ejecutivo del Consejo",
    headlineEn: "Executive Summary",
    synthesizedAt: new Date().toISOString(),
  };
}

function buildFinalRecommendation(
  reviews: DepartmentReview[],
  trigger: BoardTriggerContext,
  lead: DepartmentReview
): string {
  const ceoReview = reviews.find((r) => r.department === "CEO");
  const core = ceoReview?.recomendacion ?? lead.recomendacion;

  if (trigger.decision) {
    const d = trigger.decision;
    return `El Consejo recomienda resolver "${d.title}" con enfoque ${d.options[0] ?? "validado"}. ${core}`;
  }

  if (trigger.reason === "phase_validate") {
    return `Validar hipótesis clave antes de BUILD. ${core}`;
  }

  if (trigger.reason === "phase_deploy") {
    const qa = reviews.find((r) => r.department === "QA");
    return `Proceder con despliegue controlado. ${qa?.recomendacion ?? core}`;
  }

  if (trigger.reason === "pair_founder_high_risk") {
    return `Mitigar riesgos altos antes de avanzar. ${core}`;
  }

  return core;
}

function buildAlternatives(reviews: DepartmentReview[], trigger: BoardTriggerContext): string[] {
  const alts: string[] = [];

  if (trigger.decision && trigger.decision.options.length > 1) {
    alts.push(
      ...trigger.decision.options.slice(1, 3).map((o) => `Alternativa: ${o} para ${trigger.decision!.title}`)
    );
  }

  const cto = reviews.find((r) => r.department === "CTO");
  const cfo = reviews.find((r) => r.department === "CFO");
  const research = reviews.find((r) => r.department === "Research");

  if (cto && alts.length < 3) {
    alts.push(`Enfoque técnico incremental: ${cto.recomendacion.slice(0, 100)}`);
  }
  if (cfo && alts.length < 3) {
    alts.push(`Opción conservadora de costes: ${cfo.recomendacion.slice(0, 100)}`);
  }
  if (research && alts.length < 3) {
    alts.push(`Validación extendida de mercado: ${research.recomendacion.slice(0, 100)}`);
  }

  return alts.slice(0, 3);
}

export function formatExecutiveSummaryForCeo(summary: ExecutiveSummary): string {
  const altBlock =
    summary.alternatives.length > 0
      ? `\n\nAlternativas:\n${summary.alternatives.map((a, i) => `${i + 1}. ${a}`).join("\n")}`
      : "";
  const riskBlock =
    summary.risks.length > 0
      ? `\n\nRiesgos agregados:\n${summary.risks.map((r) => `• ${r}`).join("\n")}`
      : "";

  return `${summary.headline}\n\nRecomendación final: ${summary.finalRecommendation}${altBlock}${riskBlock}\n\nConfianza del consejo: ${summary.confidence}%`;
}

export function departmentLabelsFromReviews(reviews: DepartmentReview[]): string[] {
  return reviews.map((r) => getParticipant(r.department).label);
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((s) => {
    const key = s.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
