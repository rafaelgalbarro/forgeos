import type { VentureProject } from "@/lib/domain/venture";
import {
  runVentureSimulator,
  ventureToSimulatorInput,
} from "@/lib/venture-simulator";
import { countPriorityActions, resolveNextAction, resolvePortfolioNextAction } from "./next-action";
import type { CEOBriefing } from "./types";
import { resolveScores } from "./venture-status";

const USER_NAME = "Rafael";

function shortName(name: string): string {
  return name.length > 48 ? `${name.slice(0, 45)}…` : name;
}

function hasEnoughContext(venture: VentureProject): boolean {
  const discoveryOk = (venture.discoveryContext?.answers.length ?? 0) >= 2;
  const researchOk = !!venture.researchReport;
  return discoveryOk || researchOk;
}

export function buildCEOBriefing(ventures: VentureProject[]): CEOBriefing {
  const priorityCount = countPriorityActions(ventures);
  const portfolioAction = resolvePortfolioNextAction(ventures);

  if (ventures.length === 0) {
    return {
      greeting: `Buenos días, ${USER_NAME}.`,
      openingLine: "He revisado tu portfolio esta mañana.",
      observation:
        "Aún no tienes startups en el portfolio. ForgeOS está listo para estructurar tu primera empresa.",
      criticalRisk: "Sin ventures activos, no hay señales de mercado que priorizar todavía.",
      recommendation: "Captura una idea y completa Discovery antes de pensar en Build.",
      expectedImpact: "Te dará una base sólida para decidir si merece la pena invertir tiempo.",
      ctaLabel: "Crear primera empresa",
      ctaHref: "/",
      importantDecisions: 1,
      hasEnoughData: false,
    };
  }

  const sorted = [...ventures].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  const focus = sorted[0];
  const name = shortName(focus.name);
  const enoughData = hasEnoughContext(focus);
  const scores = resolveScores(focus);
  const nextAction = resolveNextAction(focus);

  let observation = `${name} es tu venture más activo — conviene cerrar el siguiente paso con claridad.`;
  let criticalRisk = "Dispersar foco entre demasiadas startups reduce velocidad de validación.";
  let recommendation = nextAction.label;
  let expectedImpact = nextAction.impact;

  if (!enoughData) {
    observation = `Todavía no tengo suficiente información para valorar ${name} con confianza.`;
    criticalRisk = "Sin Discovery o Research, cualquier decisión de Build sería especulativa.";
    recommendation = "Completa Discovery y deja que ForgeOS estructure el contexto.";
    expectedImpact = "Desbloquea análisis con señales reales de mercado.";
  } else if (!focus.researchReport) {
    observation = `${name} tiene idea clara, pero Research sigue pendiente.`;
    criticalRisk = "Construir sin Research aumenta el riesgo de pivot costoso más adelante.";
    recommendation = `Completar Research de ${name}.`;
    expectedImpact = "Mejora la calidad del PRD y reduce incertidumbre antes del Build.";
  } else if ((focus.discoveryContext?.remainingQuestions.length ?? 0) > 0) {
    const n = focus.discoveryContext!.remainingQuestions.length;
    observation = `Hay ${n} decisión${n > 1 ? "es" : ""} de Discovery que pueden cambiar el rumbo de ${name}.`;
    criticalRisk = "Respuestas incompletas distorsionan el Venture Simulator y el PRD.";
    recommendation = "Responder las preguntas de Discovery pendientes.";
    expectedImpact = "Aumenta mucho las probabilidades de éxito de la startup.";
  } else if (focus.status === "building") {
    observation = `${name} está en fase de Build — el momentum es clave ahora.`;
    criticalRisk = "Parar el Build sin revisar el workflow puede generar deuda técnica.";
    recommendation = "Continuar el workflow de Build sin interrupciones.";
    expectedImpact = "Acerca el lanzamiento y la validación con usuarios reales.";
  } else {
    observation = `Hay una decisión en ${name} que puede aumentar mucho las probabilidades de éxito.`;
  }

  const sim =
    focus.ventureSimulatorResult ??
    runVentureSimulator(ventureToSimulatorInput(focus));

  if (sim?.recommendation === "pivot") {
    criticalRisk = "El Venture Score sugiere que el wedge actual no es suficientemente diferenciado.";
    recommendation = "Reformular el segmento o la propuesta de valor antes del MVP.";
    expectedImpact = "Evita invertir semanas en un Build con baja probabilidad de tracción.";
  } else if (sim?.recommendation === "research_more") {
    criticalRisk = "Faltan señales de competencia o mercado para decidir con confianza.";
    recommendation = "Profundizar Research antes de cerrar el PRD.";
    expectedImpact = "Reduce el riesgo de construir algo que el mercado no necesita.";
  } else if (scores.ventureScore !== null && scores.ventureScore < 45 && scores.hasSimulation) {
    criticalRisk = "El Venture Score es bajo — la propuesta sigue siendo demasiado generalista.";
    recommendation = "Especializar el nicho o acotar el MVP antes de escalar.";
    expectedImpact = "Concentra recursos donde la probabilidad de éxito es mayor.";
  } else if (!focus.productPRD && focus.researchReport) {
    criticalRisk = "Sin PRD, el equipo no tiene un contrato claro de qué construir.";
    recommendation = `Definir el PRD de ${name} con el Product Worker.`;
    expectedImpact = "Mejora la calidad del Build Plan y acelera el desarrollo.";
  }

  return {
    greeting: `Buenos días, ${USER_NAME}.`,
    openingLine: "He revisado tu portfolio esta mañana.",
    observation,
    criticalRisk,
    recommendation,
    expectedImpact,
    ctaLabel: "Ver recomendación",
    ctaHref: portfolioAction?.href ?? `/venture/${focus.id}`,
    importantDecisions: priorityCount,
    hasEnoughData: enoughData,
  };
}
