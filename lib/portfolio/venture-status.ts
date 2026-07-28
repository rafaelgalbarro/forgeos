import type { VentureProject } from "@/lib/domain/venture";
import {
  runVentureSimulator,
  ventureToSimulatorInput,
} from "@/lib/venture-simulator";
import type {
  AITeamMember,
  PipelineStep,
  PipelineStepStatus,
  ScoreDisplay,
  VentureLifeStage,
  VentureStatusBadge,
} from "./types";

export function sectionHasContent(venture: VentureProject, id: string): boolean {
  const section = venture.sections.find((s) => s.id === id);
  return !!section?.content?.trim();
}

export function resolveScores(venture: VentureProject): {
  startupScore: number;
  ventureScore: number | null;
  hasSimulation: boolean;
  confidence: "alta" | "media" | "baja";
} {
  const persistedSim = venture.ventureSimulatorResult;
  const sim = persistedSim ?? runVentureSimulator(ventureToSimulatorInput(venture));

  if (sim) {
    return {
      startupScore: sim.startupScore,
      ventureScore: sim.ventureScore,
      hasSimulation: !!persistedSim || sim.ventureScore > 0,
      confidence: sim.confidence,
    };
  }

  const startup = venture.intelligenceReport?.startupScore ?? null;
  return {
    startupScore: startup ?? 0,
    ventureScore: null,
    hasSimulation: false,
    confidence: venture.discoveryContext?.answers.length ? "media" : "baja",
  };
}

export function formatStartupScore(score: number): ScoreDisplay {
  if (score <= 0) {
    return {
      value: null,
      label: "Pendiente de análisis",
      display: "Pendiente",
      pending: true,
    };
  }
  if (score < 40) {
    return { value: score, label: "Necesita validación", display: `${score}`, pending: false };
  }
  if (score < 70) {
    return { value: score, label: "Potencial moderado", display: `${score}`, pending: false };
  }
  return { value: score, label: "Alta oportunidad", display: `${score}`, pending: false };
}

export function formatVentureScore(
  score: number | null,
  hasSimulation: boolean
): ScoreDisplay {
  if (!hasSimulation || score === null || score <= 0) {
    return {
      value: null,
      label: "Pendiente de simulación",
      display: "Pendiente",
      pending: true,
    };
  }
  if (score < 40) {
    return { value: score, label: "Riesgo elevado", display: `${score}`, pending: false };
  }
  if (score < 65) {
    return { value: score, label: "Viable con MVP acotado", display: `${score}`, pending: false };
  }
  return { value: score, label: "Fuerte para build", display: `${score}`, pending: false };
}

const CATEGORY_LABELS: Record<string, string> = {
  saas: "SaaS",
  marketplace: "Marketplace",
  mobile: "Mobile",
  consumer: "Consumer",
  b2b: "B2B",
  fintech: "Fintech",
  health: "Health",
  education: "Education",
  other: "Startup digital",
};

export function formatVentureType(category: string): string {
  return CATEGORY_LABELS[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

export function resolveLifeStage(venture: VentureProject, ventureScore: number | null): {
  stage: VentureLifeStage;
  label: string;
} {
  if (venture.status === "intelligence") {
    return { stage: "validando", label: "Validando" };
  }
  if (venture.status === "building") {
    return { stage: "construyendo", label: "Construyendo" };
  }
  if (sectionHasContent(venture, "landing") && (ventureScore ?? 0) >= 70) {
    return { stage: "escalando", label: "Escalando" };
  }
  if (venture.status === "ready" && venture.productPRD) {
    return { stage: "operando", label: "Operando" };
  }
  if (!venture.researchReport && !venture.productPRD) {
    return { stage: "idea", label: "Idea" };
  }
  return { stage: "operando", label: "Operando" };
}

export function resolveStatusBadge(venture: VentureProject): {
  badge: VentureStatusBadge;
  label: string;
} {
  if (venture.status === "intelligence") {
    return { badge: "validando", label: "Validando" };
  }
  if (venture.status === "building") {
    return { badge: "build", label: "Build" };
  }
  if (sectionHasContent(venture, "landing")) {
    return { badge: "launch", label: "Launch" };
  }
  if (venture.status === "ready") {
    return { badge: "operando", label: "Operando" };
  }
  if (!venture.researchReport) {
    return { badge: "idea", label: "Idea" };
  }
  return { badge: "validando", label: "Validando" };
}

function pipelineStatus(
  done: boolean,
  active: boolean,
  blocked: boolean
): PipelineStepStatus {
  if (blocked) return "blocked";
  if (done) return "complete";
  if (active) return "active";
  return "pending";
}

export function buildPipeline(
  venture: VentureProject,
  recommendation?: string
): PipelineStep[] {
  const discoveryDone =
    (venture.discoveryContext?.answers.length ?? 0) >= 2 ||
    (venture.discoveryAnswers
      ? Object.keys(venture.discoveryAnswers).length >= 2
      : false);
  const researchDone = !!venture.researchReport;
  const productDone = !!venture.productPRD;
  const uxDone = sectionHasContent(venture, "ux") || sectionHasContent(venture, "wireframes");
  const archDone = sectionHasContent(venture, "arquitectura");
  const buildDone =
    venture.status === "ready" &&
    (sectionHasContent(venture, "frontend") || sectionHasContent(venture, "backend"));
  const launchDone = sectionHasContent(venture, "landing");

  const buildBlocked = recommendation === "do_not_build_yet" && !buildDone;
  const launchBlocked = !buildDone && !launchDone;

  const activeDiscovery = venture.status === "intelligence" && !discoveryDone;
  const activeResearch = discoveryDone && !researchDone;
  const activeProduct = researchDone && !productDone;
  const activeUx = productDone && !uxDone;
  const activeArch = uxDone && !archDone;
  const activeBuild =
    (venture.status === "building" || (archDone && !buildDone)) && !buildBlocked;
  const activeLaunch = buildDone && !launchDone;

  return [
    {
      id: "discovery",
      label: "Discovery",
      status: pipelineStatus(discoveryDone, activeDiscovery, false),
    },
    {
      id: "research",
      label: "Research",
      status: pipelineStatus(researchDone, activeResearch, !discoveryDone && !researchDone),
    },
    {
      id: "product",
      label: "Product",
      status: pipelineStatus(productDone, activeProduct, false),
    },
    { id: "ux", label: "UX", status: pipelineStatus(uxDone, activeUx, false) },
    {
      id: "architecture",
      label: "Architecture",
      status: pipelineStatus(archDone, activeArch, false),
    },
    {
      id: "build",
      label: "Build",
      status: pipelineStatus(buildDone, activeBuild, buildBlocked),
    },
    {
      id: "launch",
      label: "Launch",
      status: pipelineStatus(launchDone, activeLaunch, launchBlocked && !buildDone),
    },
  ];
}

export function deriveCurrentState(venture: VentureProject): string {
  const remaining = venture.discoveryContext?.remainingQuestions?.length ?? 0;
  const answered = venture.discoveryContext?.answers.length ?? 0;

  if (remaining > 0 || answered < 2 || !venture.intelligenceAccepted) {
    return "ForgeOS está esperando tu decisión";
  }
  if (!venture.researchReport) {
    return "Research pendiente";
  }
  if (venture.status === "building") {
    return "Build en progreso";
  }
  if (venture.productPRD && venture.status === "ready") {
    return "Lista para revisar";
  }
  if (sectionHasContent(venture, "landing")) {
    return "Lista para lanzar";
  }
  return "En validación";
}

export function deriveNextActionLabel(venture: VentureProject): string {
  const remaining = venture.discoveryContext?.remainingQuestions?.length ?? 0;
  const answered = venture.discoveryContext?.answers.length ?? 0;

  if (venture.status === "intelligence") {
    if (remaining > 0) {
      return `Responder ${remaining} pregunta${remaining > 1 ? "s" : ""}`;
    }
    if (answered < 2) {
      const need = Math.max(1, 2 - answered);
      return `Responder ${need} pregunta${need > 1 ? "s" : ""}`;
    }
    if (!venture.researchReport) return "Completar Research";
    if (!venture.intelligenceAccepted) return "Revisar Venture Simulator";
    return "Continuar hacia Build";
  }

  if (venture.status === "building") return "Continuar Build";

  if (!venture.researchReport) return "Completar Research";
  if (!venture.productPRD) return "Revisar PRD";

  const sim =
    venture.ventureSimulatorResult ??
    runVentureSimulator(ventureToSimulatorInput(venture));

  if (sim?.recommendation === "research_more") return "Completar Research";
  if (sim?.recommendation === "pivot") return "Revisar pivot sugerido";

  if (!sectionHasContent(venture, "frontend") && venture.productPRD) {
    return "Revisar Build Plan";
  }

  if (sectionHasContent(venture, "landing")) return "Lanzar Beta";
  if (venture.productPRD) return "Revisar PRD";

  return "Abrir venture workspace";
}

/** @deprecated Use resolveNextAction from next-action.ts */
export function deriveNextAction(venture: VentureProject): string {
  return deriveNextActionLabel(venture);
}

export function buildAITeam(venture: VentureProject): AITeamMember[] {
  const researchDone = !!venture.researchReport;
  const productDone = !!venture.productPRD;
  const archDone = sectionHasContent(venture, "arquitectura");
  const building = venture.status === "building";
  const discoveryPending =
    (venture.discoveryContext?.remainingQuestions?.length ?? 0) > 0 ||
    (venture.discoveryContext?.answers.length ?? 0) < 2;

  const sim =
    venture.ventureSimulatorResult ??
    runVentureSimulator(ventureToSimulatorInput(venture));
  const buildBlocked = sim?.recommendation === "do_not_build_yet";

  return [
    {
      role: "CEO",
      status: "revisando",
      statusLabel: "Revisando",
    },
    {
      role: "Research",
      status: discoveryPending ? "bloqueado" : researchDone ? "listo" : "pendiente",
      statusLabel: discoveryPending ? "Bloqueado" : researchDone ? "Listo" : "Pendiente",
    },
    {
      role: "Product",
      status: productDone ? "listo" : researchDone ? "en-progreso" : "pendiente",
      statusLabel: productDone ? "Listo" : researchDone ? "En progreso" : "Pendiente",
    },
    {
      role: "CTO",
      status: buildBlocked ? "bloqueado" : archDone ? "listo" : building ? "en-progreso" : "pendiente",
      statusLabel: buildBlocked ? "Bloqueado" : archDone ? "Listo" : building ? "En progreso" : "Pendiente",
    },
    {
      role: "Marketing",
      status: sectionHasContent(venture, "landing") ? "listo" : "pendiente",
      statusLabel: sectionHasContent(venture, "landing") ? "Listo" : "Pendiente",
    },
  ];
}

export function ventureHref(venture: VentureProject): string {
  if (venture.status === "ready") return `/venture/${venture.id}`;
  if (venture.status === "building") return `/build/${venture.id}`;
  return `/intelligence/${venture.id}`;
}
