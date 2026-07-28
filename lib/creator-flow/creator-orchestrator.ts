/**
 * Creator Flow orchestrator — advances steps and composes module adapters (Epic 7.7).
 */

import type { VentureProject } from "@/lib/domain/venture";
import { VANDL_VENTURE, VANDL_VENTURE_ID, resolveVandlVenture } from "@/lib/fixtures/vandl-venture";
import { getVentureById, getVentures } from "@/lib/store/ventures";
import { sectionHasContent } from "@/lib/portfolio/venture-status";
import {
  adaptBoardDecision,
  adaptBuildStatus,
  adaptCeoBrief,
  adaptGrowthStatus,
  adaptKnowledgeRefs,
  adaptReleaseSummary,
  adaptTimelineHighlights,
  adaptWorkspaceSnapshot,
} from "./creator-adapters";
import { CREATOR_STEPS, getCreatorStep, getNextCreatorStepId } from "./creator-steps";
import {
  getCreatorVentureState,
  markStepComplete,
  setCreatorCurrentStep,
  setCreatorVenture,
} from "./creator-store";
import type {
  AdvanceStepResult,
  CreatorFlowSnapshot,
  CreatorFlowSummary,
  CreatorStepId,
  CreatorStepSnapshot,
  CreatorStepStatus,
} from "./types";

function discoveryAnswered(venture: VentureProject): number {
  const fromContext = venture.discoveryContext?.answers.length ?? 0;
  const fromMap = venture.discoveryAnswers ? Object.keys(venture.discoveryAnswers).length : 0;
  return Math.max(fromContext, fromMap);
}

function workspaceHref(venture: VentureProject): string {
  if (venture.status === "ready") return `/venture/${venture.id}`;
  if (venture.status === "building") return `/build/${venture.id}`;
  return `/intelligence/${venture.id}`;
}

function isStepNaturallyComplete(venture: VentureProject, stepId: CreatorStepId): boolean {
  switch (stepId) {
    case "idea":
      return (venture.ideaText?.trim().length ?? 0) >= 20 && !!venture.name;
    case "discovery":
      return discoveryAnswered(venture) >= 2;
    case "research":
      return !!venture.researchReport;
    case "ceo":
      return venture.intelligenceAccepted === true;
    case "board":
      return !!venture.ventureSimulatorResult?.recommendation;
    case "product":
      return !!venture.productPRD;
    case "architecture":
      return sectionHasContent(venture, "arquitectura");
    case "build":
      return (
        venture.status === "ready" &&
        (sectionHasContent(venture, "frontend") || sectionHasContent(venture, "backend"))
      );
    case "deploy":
      return venture.status === "ready" && sectionHasContent(venture, "frontend");
    case "growth":
      return sectionHasContent(venture, "kpis") || sectionHasContent(venture, "roadmap");
    default:
      return false;
  }
}

function stepProgress(venture: VentureProject, stepId: CreatorStepId): number {
  if (isStepNaturallyComplete(venture, stepId)) return 100;
  switch (stepId) {
    case "idea": {
      const len = venture.ideaText?.trim().length ?? 0;
      return Math.min(90, Math.round((len / 20) * 100));
    }
    case "discovery":
      return Math.min(90, Math.round((discoveryAnswered(venture) / 2) * 100));
    case "research":
      return venture.researchReport ? 100 : venture.intelligenceReport ? 40 : 10;
    case "ceo":
      return venture.intelligenceAccepted ? 100 : venture.intelligenceReport ? 50 : 0;
    case "board":
      return venture.ventureSimulatorResult ? 100 : 20;
    case "product":
      return venture.productPRD ? 100 : venture.researchReport ? 30 : 0;
    case "architecture":
      return sectionHasContent(venture, "arquitectura") ? 100 : venture.productPRD ? 25 : 0;
    case "build": {
      const build = adaptBuildStatus(venture);
      return build.progress;
    }
    case "deploy": {
      const release = adaptReleaseSummary(venture);
      return release.valid ? 100 : venture.status === "ready" ? 60 : 10;
    }
    case "growth": {
      const growth = adaptGrowthStatus(venture);
      const done = growth.lifecycle.filter((s) => s.status === "complete").length;
      return Math.round((done / growth.lifecycle.length) * 100);
    }
    default:
      return 0;
  }
}

function buildStepContent(venture: VentureProject, stepId: CreatorStepId): Pick<
  CreatorStepSnapshot,
  "whatHappened" | "whatToDoNext" | "ctaLabel" | "ctaHref" | "executiveSummary"
> {
  const href = workspaceHref(venture);
  const timeline = adaptTimelineHighlights(venture, stepId, 3);
  const whatHappened =
    timeline.length > 0
      ? timeline.map((t) => `${t.title}: ${t.description}`)
      : ["Aún no hay actividad registrada en este paso."];

  switch (stepId) {
    case "idea":
      return {
        whatHappened,
        whatToDoNext: isStepNaturallyComplete(venture, "idea")
          ? "Tu idea está articulada. Avanza a Discovery para contextualizar el venture."
          : "Describe el problema, el cliente y la propuesta de valor con al menos 20 caracteres.",
        ctaLabel: isStepNaturallyComplete(venture, "idea") ? "Continuar a Discovery" : "Refinar idea",
        ctaHref: venture.id ? href : "/",
      };
    case "discovery":
      return {
        whatHappened,
        whatToDoNext:
          discoveryAnswered(venture) >= 2
            ? "Discovery completo. El siguiente paso es Research de mercado."
            : `Responde ${Math.max(0, 2 - discoveryAnswered(venture))} preguntas más de Discovery.`,
        ctaLabel: discoveryAnswered(venture) >= 2 ? "Continuar a Research" : "Completar Discovery",
        ctaHref: `/intelligence/${venture.id}`,
      };
    case "research": {
      const knowledge = adaptKnowledgeRefs(venture);
      const extras =
        knowledge.length > 0 ? [`${knowledge.length} referencias de conocimiento vinculadas.`] : [];
      return {
        whatHappened: [...whatHappened, ...extras],
        whatToDoNext: venture.researchReport
          ? "Research listo. Revisa el briefing del CEO antes de la decisión de board."
          : "Genera el análisis de mercado y competencia.",
        ctaLabel: venture.researchReport ? "Continuar a CEO" : "Iniciar Research",
        ctaHref: venture.status === "ready" ? `/venture/${venture.id}` : href,
      };
    }
    case "ceo": {
      const brief = adaptCeoBrief(venture);
      return {
        whatHappened: [brief.observation, ...(timeline.length ? timeline.map((t) => t.title) : [])],
        whatToDoNext: brief.recommendation,
        ctaLabel: venture.intelligenceAccepted ? "Continuar a Board" : "Aceptar revisión CEO",
        ctaHref: "/ceo",
        executiveSummary: `${brief.observation}\n\nRecomendación: ${brief.recommendation}\n\nRiesgo: ${brief.criticalRisk}\n\nOportunidad: ${brief.opportunity}`,
      };
    }
    case "board": {
      const board = adaptBoardDecision(venture);
      return {
        whatHappened: [board.summary, ...whatHappened.slice(0, 2)],
        whatToDoNext: board.recommendation
          ? "La gobernanza ha emitido recomendación. Define el PRD con alcance de MVP."
          : "Ejecuta el Venture Simulator para obtener la decisión de board.",
        ctaLabel: board.recommendation ? "Continuar a Product" : "Obtener decisión de Board",
        ctaHref: `/founder-journey?ventureId=${venture.id}`,
        executiveSummary: board.summary,
      };
    }
    case "product": {
      const ws = adaptWorkspaceSnapshot(venture);
      return {
        whatHappened: ws.product.hasContent
          ? [ws.product.excerpt, ...whatHappened.slice(0, 1)]
          : whatHappened,
        whatToDoNext: venture.productPRD
          ? "PRD definido. Documenta la arquitectura técnica."
          : "Genera el PRD con alcance de MVP acotado.",
        ctaLabel: venture.productPRD ? "Continuar a Architecture" : "Definir Product / PRD",
        ctaHref: `/venture/${venture.id}`,
      };
    }
    case "architecture": {
      const ws = adaptWorkspaceSnapshot(venture);
      return {
        whatHappened: ws.architecture.hasContent ? [ws.architecture.excerpt] : whatHappened,
        whatToDoNext: sectionHasContent(venture, "arquitectura")
          ? "Arquitectura documentada. Inicia la construcción del MVP."
          : "Define stack, datos y despliegue antes del Build.",
        ctaLabel: sectionHasContent(venture, "arquitectura") ? "Continuar a Build" : "Definir Architecture",
        ctaHref: venture.status === "building" ? `/build/${venture.id}` : `/venture/${venture.id}`,
      };
    }
    case "build": {
      const build = adaptBuildStatus(venture);
      return {
        whatHappened: [
          `Estado: ${build.pipelineLabel}`,
          ...build.items.map((i) => `${i.label}: ${i.done ? "completado" : "pendiente"}`),
        ],
        whatToDoNext:
          build.progress >= 100
            ? "Build completado. Prepara el release y el despliegue."
            : "Continúa la construcción hasta completar los entregables clave.",
        ctaLabel: build.progress >= 100 ? "Continuar a Deploy" : "Continuar Build",
        ctaHref: venture.status === "building" ? `/build/${venture.id}` : `/venture/${venture.id}`,
      };
    }
    case "deploy": {
      const release = adaptReleaseSummary(venture);
      return {
        whatHappened: [
          `Release v${release.version} — ${release.gatesPassed}/${release.gatesTotal} quality gates`,
          `${release.checklistItems} items en checklist de despliegue`,
        ],
        whatToDoNext: release.valid
          ? "Release validado. Activa el plan de Growth."
          : "Completa el checklist de release y validación de despliegue.",
        ctaLabel: release.valid ? "Continuar a Growth" : "Preparar Deploy",
        ctaHref: `/venture/${venture.id}`,
      };
    }
    case "growth": {
      const growth = adaptGrowthStatus(venture);
      return {
        whatHappened: [
          ...growth.lifecycle.map((s) => `${s.label}: ${s.status}`),
          ...whatHappened.slice(0, 1),
        ],
        whatToDoNext: "Define landing, KPIs y roadmap de tracción para las primeras semanas.",
        ctaLabel: "Ver plan de Growth",
        ctaHref: `/venture/${venture.id}`,
      };
    }
    default:
      return {
        whatHappened,
        whatToDoNext: "Continúa con el siguiente paso del Creator Flow.",
        ctaLabel: "Continuar",
      };
  }
}

function resolveStepStatuses(
  venture: VentureProject,
  storeCompleted: CreatorStepId[]
): Map<CreatorStepId, CreatorStepStatus> {
  const statuses = new Map<CreatorStepId, CreatorStepStatus>();
  let foundActive = false;

  for (const step of CREATOR_STEPS) {
    const natural = isStepNaturallyComplete(venture, step.id);
    const stored = storeCompleted.includes(step.id);
    const complete = natural || stored;

    if (complete) {
      statuses.set(step.id, "complete");
    } else if (!foundActive) {
      statuses.set(step.id, venture.ventureSimulatorResult?.recommendation === "do_not_build_yet" && step.order > 5 ? "blocked" : "active");
      foundActive = true;
    } else {
      statuses.set(step.id, "pending");
    }
  }

  return statuses;
}

function estimateTimeRemaining(steps: CreatorStepSnapshot[]): string {
  const pending = steps.filter((s) => s.status !== "complete");
  if (pending.length === 0) return "Completado";
  const minutes = pending.reduce((acc, s) => {
    const m = parseInt(s.estimatedTime, 10);
    return acc + (Number.isNaN(m) ? 30 : m);
  }, 0);
  if (minutes < 60) return `~${minutes} min`;
  return `~${Math.round(minutes / 60)} h`;
}

export function computeCreatorFlow(venture: VentureProject): CreatorFlowSnapshot {
  const storeState = getCreatorVentureState(venture.id);
  const statusMap = resolveStepStatuses(venture, storeState.completedStepIds);

  const steps: CreatorStepSnapshot[] = CREATOR_STEPS.map((def) => {
    const content = buildStepContent(venture, def.id);
    const status = statusMap.get(def.id) ?? "pending";
    const progress = stepProgress(venture, def.id);
    const natural = isStepNaturallyComplete(venture, def.id);
    const stored = storeState.completedStepIds.includes(def.id);

    return {
      ...def,
      status,
      progress: status === "complete" ? 100 : progress,
      ...content,
      canAdvance: natural || stored || status === "active",
    };
  });

  const stepsComplete = steps.filter((s) => s.status === "complete").length;
  const activeStep = steps.find((s) => s.status === "active") ?? steps[steps.length - 1];
  const currentStepId = storeState.currentStepId ?? activeStep.id;

  const summary: CreatorFlowSummary = {
    ventureId: venture.id,
    ventureName: venture.name,
    currentStepId,
    currentStepLabel: getCreatorStep(currentStepId).label,
    overallProgress: Math.round((stepsComplete / CREATOR_STEPS.length) * 100),
    stepsComplete,
    stepsTotal: CREATOR_STEPS.length,
    estimatedTimeRemaining: estimateTimeRemaining(steps),
  };

  return {
    summary,
    steps,
    timelineHighlights: adaptTimelineHighlights(venture, undefined, 8),
    knowledgeRefs: adaptKnowledgeRefs(venture),
    updatedAt: new Date().toISOString(),
  };
}

export function advanceCreatorStep(
  venture: VentureProject,
  stepId?: CreatorStepId
): AdvanceStepResult {
  setCreatorVenture(venture.id);
  const storeState = getCreatorVentureState(venture.id);
  const targetStep = stepId ?? storeState.currentStepId;
  const step = CREATOR_STEPS.find((s) => s.id === targetStep);

  if (!step) {
    return {
      success: false,
      message: "Paso no reconocido.",
      snapshot: computeCreatorFlow(venture),
    };
  }

  const natural = isStepNaturallyComplete(venture, targetStep);
  if (!natural) {
    markStepComplete(venture.id, targetStep);
  } else {
    const next = getNextCreatorStepId(targetStep);
    if (next) setCreatorCurrentStep(venture.id, next);
    else markStepComplete(venture.id, targetStep);
  }

  const snapshot = computeCreatorFlow(venture);
  const nextStep = getNextCreatorStepId(targetStep);

  return {
    success: true,
    message: nextStep
      ? `Paso «${step.label}» completado. Siguiente: ${getCreatorStep(nextStep).label}.`
      : `Paso «${step.label}» completado. Creator Flow finalizado.`,
    snapshot,
  };
}

export function resolveCreatorVenture(ventureId?: string | null): VentureProject {
  if (ventureId) {
    const fixture = resolveVandlVenture(ventureId);
    if (fixture) return fixture;
    const found = getVentureById(ventureId);
    if (found) return found;
  }

  const vandl = getVentureById(VANDL_VENTURE_ID);
  if (vandl) return vandl;

  const ventures = getVentures();
  if (ventures.length > 0) return ventures[0];

  return VANDL_VENTURE;
}

export function selectCreatorStep(ventureId: string, stepId: CreatorStepId): CreatorFlowSnapshot {
  setCreatorVenture(ventureId);
  setCreatorCurrentStep(ventureId, stepId);
  const venture = getVentureById(ventureId) ?? resolveCreatorVenture(ventureId);
  return computeCreatorFlow(venture);
}
