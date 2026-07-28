/** ForgeOS AI Orchestration — mock fallbacks. */

import type { BoardMemberId, OrchestrationTaskId } from "./types";

export function getMockOutput(taskId: OrchestrationTaskId, member?: BoardMemberId): string {
  switch (taskId) {
    case "CEO_BRIEF":
      return JSON.stringify({
        summary: "ForgeOS ha revisado tu venture. El siguiente paso crítico es cerrar Discovery.",
        executiveSummary: "Portfolio con señales parciales — priorizar validación antes de Build.",
        priority: "Completar Discovery antes de invertir en Build.",
        topPriorities: ["Discovery", "Research", "Simulator"],
        risks: ["Contexto incompleto", "Supuestos no validados"],
        criticalRisks: ["Build prematuro", "Falta de tracción"],
        growthOpportunities: ["Nicho vertical claro", "Automatización del onboarding"],
        blockedVentures: [],
        recommendation: "Ejecutar Research tras Discovery.",
        recommendedNextActions: ["Completar Discovery", "Ejecutar Research"],
        expectedImpact: "Reduce riesgo y mejora calidad del PRD.",
        confidence: 0.74,
        timeHorizon: "2-4 semanas",
      });
    case "CEO_REVIEW":
      return JSON.stringify({
        summary: "Revisión ejecutiva: el venture avanza con información parcial.",
        priority: "Validar simulador y PRD.",
        risks: ["Score de simulador bajo", "Mercado no contrastado"],
        recommendation: "Priorizar Venture Simulator.",
        expectedImpact: "+15 puntos de claridad estratégica.",
      });
    case "CEO_PRIORITY":
      return JSON.stringify({
        summary: "Prioridades del día para el fundador.",
        priority: "Responder preguntas de Discovery.",
        risks: ["Retraso en validación"],
        recommendation: "15 minutos en Discovery hoy.",
        expectedImpact: "Desbloquea Research y Product.",
      });
    case "CEO_RISK":
      return JSON.stringify({
        summary: "Análisis de riesgo ejecutivo.",
        priority: "Mitigar riesgo de mercado.",
        risks: ["Competencia no analizada", "Monetización incierta"],
        recommendation: "Completar Research de competidores.",
        expectedImpact: "Reduce incertidumbre pre-build.",
      });
    case "BOARD_DEBATE":
    case "BOARD_VOTE":
    case "BOARD_CONSENSUS":
      return JSON.stringify({
        member: member ?? "CEO",
        position: "Cauteloso optimismo — validar antes de escalar.",
        opinion: "Cauteloso optimismo — validar antes de escalar.",
        argumentsFor: ["Idea clara", "Mercado addressable"],
        argumentsAgainst: ["Falta tracción", "Recursos limitados"],
        risks: ["Time-to-market", "Adopción"],
        opportunities: ["Partnerships", "Upsell B2B"],
        vote: taskId === "BOARD_VOTE" ? "approve_with_conditions" : "pending",
        confidence: 0.72,
        suggestedAction: "Completar Discovery y Research antes de escalar.",
      });
    case "BUILD_PLAN":
    case "BUILD_ARCHITECTURE":
    case "BUILD_BACKEND":
    case "BUILD_FRONTEND":
    case "BUILD_DATABASE":
    case "BUILD_DEPLOY":
    case "BUILD_QA":
      return JSON.stringify({
        summary: `Mock ${taskId}: plan técnico generado sin API keys.`,
        architecture: "Next.js App Router + API routes + localStorage ventures.",
        modules: ["frontend", "api", "workers", "export"],
        steps: ["Scaffold", "Integrar FHIS", "Conectar Build Engine"],
        risks: ["Deuda técnica si se salta QA"],
        nextActions: ["Definir PRD", "Ejecutar Build Plan real con keys"],
      });
    default:
      return JSON.stringify({ mock: true, taskId });
  }
}
