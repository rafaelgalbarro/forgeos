import type { VentureProject } from "@/lib/domain/venture";
import { sectionHasContent } from "@/lib/portfolio/venture-status";
import { FOUNDER_JOURNEY_PHASES } from "./phases";
import type {
  FounderJourneySnapshot,
  JourneyBlocker,
  JourneyNextAction,
  JourneyPhaseId,
  JourneyPhaseState,
  JourneyPhaseStatus,
  JourneySummary,
} from "./types";

interface PhaseSignals {
  complete: boolean;
  progress: number;
  blockers: JourneyBlocker[];
  nextAction: JourneyNextAction | null;
  valueGenerated: string;
  executiveNote?: string;
}

function discoveryAnswered(venture: VentureProject): number {
  const fromContext = venture.discoveryContext?.answers.length ?? 0;
  const fromMap = venture.discoveryAnswers
    ? Object.keys(venture.discoveryAnswers).length
    : 0;
  return Math.max(fromContext, fromMap);
}

function workspaceHref(venture: VentureProject): string {
  if (venture.status === "ready") return `/venture/${venture.id}`;
  if (venture.status === "building") return `/build/${venture.id}`;
  return `/intelligence/${venture.id}`;
}

function simRecommendation(venture: VentureProject): string | undefined {
  return venture.ventureSimulatorResult?.recommendation;
}

function buildBlocked(venture: VentureProject): boolean {
  return simRecommendation(venture) === "do_not_build_yet";
}

function evaluatePhase(venture: VentureProject, phaseId: JourneyPhaseId): PhaseSignals {
  const href = workspaceHref(venture);
  const answered = discoveryAnswered(venture);
  const discoveryDone = answered >= 2;
  const hasIntelligence = !!venture.intelligenceReport;
  const researchDone = !!venture.researchReport;
  const competitorsDone =
    sectionHasContent(venture, "competidores") || sectionHasContent(venture, "mercado");
  const ceoDone = venture.intelligenceAccepted === true;
  const boardDone = !!venture.ventureSimulatorResult;
  const productDone = !!venture.productPRD;
  const archDone = sectionHasContent(venture, "arquitectura");
  const uxDone =
    sectionHasContent(venture, "ux") || sectionHasContent(venture, "wireframes");
  const buildDone =
    venture.status === "ready" &&
    (sectionHasContent(venture, "frontend") || sectionHasContent(venture, "backend"));
  const qaDone = sectionHasContent(venture, "qa");
  const deployDone =
    venture.status === "ready" &&
    sectionHasContent(venture, "frontend") &&
    sectionHasContent(venture, "backend");
  const launchDone = sectionHasContent(venture, "landing");
  const growthDone =
    sectionHasContent(venture, "kpis") || sectionHasContent(venture, "roadmap");

  switch (phaseId) {
    case "idea": {
      const len = venture.ideaText?.trim().length ?? 0;
      const complete = len >= 20 && !!venture.name;
      return {
        complete,
        progress: complete ? 100 : Math.min(90, Math.round((len / 20) * 100)),
        blockers: complete ? [] : [{ id: "idea-empty", label: "Describe tu idea con más detalle", severity: "warning" }],
        nextAction: complete
          ? null
          : { label: "Refinar idea", description: "Añade contexto sobre el problema y el usuario", href, estimatedMinutes: 10 },
        valueGenerated: complete ? "Idea articulada y nombre de proyecto" : "Borrador inicial",
      };
    }
    case "discovery": {
      const complete = discoveryDone;
      const progress = Math.min(100, Math.round((answered / 2) * 100));
      return {
        complete,
        progress: complete ? 100 : progress,
        blockers: complete
          ? []
          : [{ id: "discovery-pending", label: `${Math.max(0, 2 - answered)} respuestas pendientes`, severity: "warning" }],
        nextAction: complete
          ? null
          : {
              label: "Responder Discovery",
              description: "Completa las preguntas para desbloquear validación",
              href: `/intelligence/${venture.id}`,
              estimatedMinutes: 20,
            },
        valueGenerated: complete ? "Mapa de incógnitas y contexto fundador" : "Discovery en curso",
      };
    }
    case "validacion": {
      const complete = hasIntelligence;
      return {
        complete,
        progress: complete ? 100 : discoveryDone ? 40 : 0,
        blockers: !discoveryDone
          ? [{ id: "validacion-discovery", label: "Completa Discovery primero", severity: "critical" }]
          : complete
            ? []
            : [{ id: "validacion-pending", label: "Análisis de inteligencia pendiente", severity: "warning" }],
        nextAction: complete
          ? null
          : {
              label: "Generar análisis",
              description: "ForgeOS analizará tu idea con contexto de Discovery",
              href: `/intelligence/${venture.id}`,
              estimatedMinutes: 15,
            },
        valueGenerated: complete
          ? `Score inicial: ${venture.intelligenceReport?.startupScore ?? "—"}`
          : "Pendiente de análisis",
      };
    }
    case "research": {
      const complete = researchDone;
      return {
        complete,
        progress: complete ? 100 : hasIntelligence ? 25 : 0,
        blockers: !hasIntelligence
          ? [{ id: "research-validacion", label: "Validación pendiente", severity: "critical" }]
          : complete
            ? []
            : [{ id: "research-pending", label: "Research no iniciado", severity: "warning" }],
        nextAction: complete
          ? null
          : {
              label: "Completar Research",
              description: "Profundiza en mercado y tendencias",
              href,
              estimatedMinutes: 45,
            },
        valueGenerated: complete ? "Research report y referencias de mercado" : "Sin research",
      };
    }
    case "competidores": {
      const complete = competitorsDone;
      return {
        complete,
        progress: complete ? 100 : researchDone ? 30 : 0,
        blockers: !researchDone
          ? [{ id: "competidores-research", label: "Research requerido", severity: "critical" }]
          : complete
            ? []
            : [{ id: "competidores-pending", label: "Análisis competitivo pendiente", severity: "info" }],
        nextAction: complete
          ? null
          : {
              label: "Revisar competidores",
              description: "Abre la sección de mercado y competencia",
              href: venture.status === "ready" ? `/venture/${venture.id}` : href,
              estimatedMinutes: 30,
            },
        valueGenerated: complete ? "Landscape competitivo y posicionamiento" : "Pendiente",
      };
    }
    case "ceo-review": {
      const complete = ceoDone;
      const note = complete
        ? "El equipo ejecutivo ha consolidado hallazgos de mercado y alineación estratégica. La venture está lista para decisión de board."
        : researchDone
          ? "El CEO AI está preparando la revisión ejecutiva con los hallazgos de Research y competencia."
          : "La revisión CEO se activará cuando Research y contexto estén completos.";
      return {
        complete,
        progress: complete ? 100 : researchDone && competitorsDone ? 60 : researchDone ? 35 : 0,
        blockers: !researchDone
          ? [{ id: "ceo-research", label: "Research incompleto", severity: "warning" }]
          : [],
        nextAction: complete
          ? null
          : {
              label: "Revisar con CEO",
              description: "Acepta el análisis y revisa recomendaciones ejecutivas",
              href: `/intelligence/${venture.id}`,
              estimatedMinutes: 10,
            },
        valueGenerated: complete ? "Revisión ejecutiva completada" : "Milestone ejecutivo pendiente",
        executiveNote: note,
      };
    }
    case "board-decision": {
      const complete = boardDone;
      const rec = venture.ventureSimulatorResult?.recommendation;
      const recLabel =
        rec === "build"
          ? "Build aprobado"
          : rec === "do_not_build_yet"
            ? "Build en pausa"
            : rec === "pivot"
              ? "Pivot recomendado"
              : rec === "research_more"
                ? "Más research requerido"
                : "Evaluación pendiente";
      const note = complete
        ? `El board ha emitido su recomendación: ${recLabel}. Esta decisión guía las fases de producto y construcción.`
        : ceoDone
          ? "El board está evaluando viabilidad, riesgo y encaje estratégico antes de autorizar build."
          : "La decisión de board requiere la revisión CEO previa.";
      return {
        complete,
        progress: complete ? 100 : ceoDone ? 50 : 0,
        blockers: !ceoDone
          ? [{ id: "board-ceo", label: "CEO Review pendiente", severity: "warning" }]
          : buildBlocked(venture)
            ? [{ id: "board-hold", label: "Board recomienda pausar build", severity: "critical" }]
            : [],
        nextAction: complete
          ? null
          : {
              label: "Revisar Venture Simulator",
              description: "Consulta la recomendación formal del board",
              href: `/intelligence/${venture.id}`,
              estimatedMinutes: 15,
            },
        valueGenerated: complete ? `Decisión: ${recLabel}` : "Decisión de board pendiente",
        executiveNote: note,
      };
    }
    case "product": {
      const complete = productDone;
      const blocked = buildBlocked(venture) && !productDone;
      return {
        complete,
        progress: complete ? 100 : boardDone ? 20 : 0,
        blockers: blocked
          ? [{ id: "product-board-hold", label: "Board no ha aprobado build aún", severity: "critical" }]
          : !boardDone
            ? [{ id: "product-board", label: "Decisión de board pendiente", severity: "warning" }]
            : [],
        nextAction: complete
          ? null
          : {
              label: "Definir producto",
              description: "Revisa o genera el PRD de tu venture",
              href,
              estimatedMinutes: 60,
            },
        valueGenerated: complete ? "PRD y definición de MVP" : "Producto sin definir",
      };
    }
    case "architecture": {
      const complete = archDone;
      return {
        complete,
        progress: complete ? 100 : productDone ? 25 : 0,
        blockers: !productDone
          ? [{ id: "arch-product", label: "PRD requerido", severity: "critical" }]
          : [],
        nextAction: complete
          ? null
          : {
              label: "Diseñar arquitectura",
              description: "Define stack y blueprint técnico",
              href: venture.status === "ready" ? `/venture/${venture.id}` : href,
              estimatedMinutes: 45,
            },
        valueGenerated: complete ? "Blueprint técnico y decisiones de stack" : "Arquitectura pendiente",
      };
    }
    case "ux": {
      const complete = uxDone;
      return {
        complete,
        progress: complete ? 100 : productDone ? 20 : 0,
        blockers: !productDone
          ? [{ id: "ux-product", label: "Producto sin definir", severity: "warning" }]
          : [],
        nextAction: complete
          ? null
          : {
              label: "Diseñar UX",
              description: "Revisa wireframes y flujos de usuario",
              href: venture.status === "ready" ? `/venture/${venture.id}` : href,
              estimatedMinutes: 40,
            },
        valueGenerated: complete ? "Flujos UX y wireframes" : "UX pendiente",
      };
    }
    case "build": {
      const complete = buildDone;
      const blocked = buildBlocked(venture);
      return {
        complete,
        progress: complete ? 100 : venture.status === "building" ? 55 : archDone && uxDone ? 15 : 0,
        blockers: blocked
          ? [{ id: "build-hold", label: "Build pausado por decisión de board", severity: "critical" }]
          : !productDone
            ? [{ id: "build-product", label: "PRD requerido", severity: "critical" }]
            : [],
        nextAction: complete
          ? null
          : {
              label: venture.status === "building" ? "Continuar Build" : "Iniciar Build",
              description: "Construye frontend y backend del MVP",
              href: `/build/${venture.id}`,
              estimatedMinutes: 120,
            },
        valueGenerated: complete ? "Código base y artefactos de build" : "Build en progreso o pendiente",
      };
    }
    case "qa": {
      const complete = qaDone;
      return {
        complete,
        progress: complete ? 100 : buildDone ? 30 : 0,
        blockers: !buildDone
          ? [{ id: "qa-build", label: "Build incompleto", severity: "warning" }]
          : [],
        nextAction: complete
          ? null
          : {
              label: "Ejecutar QA",
              description: "Revisa checklist de calidad y pruebas",
              href: `/venture/${venture.id}`,
              estimatedMinutes: 60,
            },
        valueGenerated: complete ? "Plan de pruebas y checklist de calidad" : "QA pendiente",
      };
    }
    case "deployment": {
      const complete = deployDone;
      return {
        complete,
        progress: complete ? 100 : buildDone ? 40 : 0,
        blockers: !buildDone
          ? [{ id: "deploy-build", label: "Build no finalizado", severity: "critical" }]
          : [],
        nextAction: complete
          ? null
          : {
              label: "Preparar deploy",
              description: "Verifica que frontend y backend estén listos",
              href: `/venture/${venture.id}`,
              estimatedMinutes: 30,
            },
        valueGenerated: complete ? "Entorno desplegado y configuración lista" : "Deploy pendiente",
      };
    }
    case "launch": {
      const complete = launchDone;
      return {
        complete,
        progress: complete ? 100 : deployDone ? 50 : 0,
        blockers: !deployDone && !buildDone
          ? [{ id: "launch-build", label: "Producto no listo para lanzar", severity: "warning" }]
          : [],
        nextAction: complete
          ? null
          : {
              label: "Preparar lanzamiento",
              description: "Configura landing y mensaje de mercado",
              href: `/venture/${venture.id}`,
              estimatedMinutes: 90,
            },
        valueGenerated: complete ? "Landing y lanzamiento beta" : "Lanzamiento pendiente",
      };
    }
    case "growth": {
      const complete = growthDone;
      return {
        complete,
        progress: complete ? 100 : launchDone ? 35 : 0,
        blockers: !launchDone
          ? [{ id: "growth-launch", label: "Lanza antes de escalar", severity: "info" }]
          : [],
        nextAction: complete
          ? null
          : {
              label: "Definir métricas",
              description: "Establece KPIs y roadmap de crecimiento",
              href: `/venture/${venture.id}`,
              estimatedMinutes: 45,
            },
        valueGenerated: complete ? "KPIs y roadmap de crecimiento" : "Crecimiento por iniciar",
      };
    }
    default:
      return {
        complete: false,
        progress: 0,
        blockers: [],
        nextAction: null,
        valueGenerated: "—",
      };
  }
}

function resolveStatus(
  signals: PhaseSignals,
  isActive: boolean,
  priorIncomplete: boolean
): JourneyPhaseStatus {
  if (signals.blockers.some((b) => b.severity === "critical")) return "blocked";
  if (signals.complete) return "complete";
  if (isActive) return "active";
  if (priorIncomplete) return "pending";
  return "pending";
}

export function computeJourneyPhases(venture: VentureProject): JourneyPhaseState[] {
  const phases: JourneyPhaseState[] = [];
  let foundActive = false;
  let priorIncomplete = false;

  for (const def of FOUNDER_JOURNEY_PHASES) {
    const signals = evaluatePhase(venture, def.id);
    const isActive = !foundActive && !signals.complete;
    if (isActive) foundActive = true;

    const status = resolveStatus(signals, isActive, priorIncomplete);
    if (!signals.complete) priorIncomplete = true;

    phases.push({
      ...def,
      status,
      progress: signals.progress,
      blockers: signals.blockers,
      nextAction: signals.nextAction,
      valueGenerated: signals.valueGenerated,
      executiveNote: signals.executiveNote,
    });
  }

  return phases;
}

function estimateRemaining(phases: JourneyPhaseState[]): string {
  const pending = phases.filter((p) => p.status !== "complete");
  if (pending.length === 0) return "Completado";
  const active = pending[0];
  if (pending.length === 1) return active.estimatedTime;
  return `~${pending.length} fases · ${active.estimatedTime} en curso`;
}

function aggregateValue(phases: JourneyPhaseState[]): string {
  const done = phases.filter((p) => p.status === "complete").length;
  if (done === 0) return "Recién iniciado";
  if (done >= phases.length) return "Venture lista para escalar";
  return `${done} hitos completados`;
}

export function computeJourneySummary(
  venture: VentureProject,
  phases: JourneyPhaseState[]
): JourneySummary {
  const completeCount = phases.filter((p) => p.status === "complete").length;
  const overallProgress = Math.round(
    phases.reduce((sum, p) => sum + p.progress, 0) / phases.length
  );
  const current =
    phases.find((p) => p.status === "active" || p.status === "blocked") ??
    phases.find((p) => p.status === "pending") ??
    phases[phases.length - 1];

  return {
    ventureId: venture.id,
    ventureName: venture.name,
    overallProgress,
    currentPhaseId: current.id,
    currentPhaseLabel: current.label,
    phasesComplete: completeCount,
    phasesTotal: phases.length,
    estimatedTimeRemaining: estimateRemaining(phases),
    totalValueGenerated: aggregateValue(phases),
  };
}

export function computeFounderJourney(venture: VentureProject): FounderJourneySnapshot {
  const phases = computeJourneyPhases(venture);
  const summary = computeJourneySummary(venture, phases);

  return {
    summary,
    phases,
    timeline: phases.map((p) => ({
      phaseId: p.id,
      label: p.label,
      status: p.status,
      progress: p.progress,
      time: p.estimatedTime,
      description:
        p.status === "complete"
          ? p.valueGenerated
          : p.executiveNote ?? p.nextAction?.description ?? p.objetivo,
    })),
    updatedAt: new Date().toISOString(),
  };
}
