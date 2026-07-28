import type { VentureProject } from "@/lib/domain/venture";
import {
  runVentureSimulator,
  ventureToSimulatorInput,
} from "@/lib/venture-simulator";
import type {
  PipelineStep,
  PipelineStepStatus,
  PortfolioSummaryMetrics,
  PortfolioVentureCard,
  VentureGeneralStatus,
} from "./types";
import { formatRelativeTime } from "./time-utils";

function sectionHasContent(venture: VentureProject, id: string): boolean {
  const section = venture.sections.find((s) => s.id === id);
  return !!section?.content?.trim();
}

function resolveScores(venture: VentureProject): {
  startupScore: number;
  ventureScore: number;
  confidence: "alta" | "media" | "baja";
} {
  const sim =
    venture.ventureSimulatorResult ??
    runVentureSimulator(ventureToSimulatorInput(venture));

  if (sim) {
    return {
      startupScore: sim.startupScore,
      ventureScore: sim.ventureScore,
      confidence: sim.confidence,
    };
  }

  const startup = venture.intelligenceReport?.startupScore ?? 0;
  return {
    startupScore: startup,
    ventureScore: Math.round(startup * 0.85),
    confidence: venture.discoveryContext?.answers.length
      ? "media"
      : "baja",
  };
}

function resolveGeneralStatus(venture: VentureProject, ventureScore: number): {
  status: VentureGeneralStatus;
  label: string;
} {
  if (venture.status === "intelligence") {
    return { status: "evaluando", label: "Evaluando" };
  }
  if (venture.status === "building") {
    return { status: "construyendo", label: "Construyendo" };
  }
  if (ventureScore >= 65 && venture.productPRD) {
    return { status: "produccion", label: "Lista para producción" };
  }
  if (venture.productPRD || venture.sections.length >= 8) {
    return { status: "mvp", label: "MVP activo" };
  }
  return { status: "mvp", label: "Operativa" };
}

function pipelineStatus(done: boolean, active: boolean): PipelineStepStatus {
  if (done) return "complete";
  if (active) return "active";
  return "pending";
}

export function buildPipeline(venture: VentureProject): PipelineStep[] {
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

  const activeDiscovery = venture.status === "intelligence" && !discoveryDone;
  const activeResearch = discoveryDone && !researchDone;
  const activeProduct = researchDone && !productDone;
  const activeUx = productDone && !uxDone;
  const activeArch = uxDone && !archDone;
  const activeBuild = venture.status === "building" || (archDone && !buildDone);
  const activeLaunch = buildDone && !launchDone;

  return [
    { id: "discovery", label: "Discovery", status: pipelineStatus(discoveryDone, activeDiscovery) },
    { id: "research", label: "Research", status: pipelineStatus(researchDone, activeResearch) },
    { id: "product", label: "Product", status: pipelineStatus(productDone, activeProduct) },
    { id: "ux", label: "UX", status: pipelineStatus(uxDone, activeUx) },
    { id: "architecture", label: "Architecture", status: pipelineStatus(archDone, activeArch) },
    { id: "build", label: "Build", status: pipelineStatus(buildDone, activeBuild) },
    { id: "launch", label: "Launch", status: pipelineStatus(launchDone, activeLaunch) },
  ];
}

export function deriveNextAction(venture: VentureProject): string {
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
    if (!venture.intelligenceAccepted) {
      return "Revisar informe de Intelligence";
    }
    if (!venture.researchReport) {
      return "Completar Research";
    }
    return "Aceptar y construir startup";
  }

  if (venture.status === "building") {
    return "Continuar construcción";
  }

  if (!venture.researchReport) {
    return "Completar Research";
  }

  if (!venture.productPRD) {
    return "Generar PRD";
  }

  const sim =
    venture.ventureSimulatorResult ??
    runVentureSimulator(ventureToSimulatorInput(venture));

  if (sim?.recommendation === "build" || sim?.recommendation === "build_small_mvp") {
    if (!sectionHasContent(venture, "frontend")) {
      return "Construir aplicación";
    }
    return "Revisar Build Plan";
  }

  if (sim?.recommendation === "research_more") {
    return "Profundizar Research";
  }

  if (sim?.recommendation === "pivot") {
    return "Revisar pivot sugerido";
  }

  if (sectionHasContent(venture, "landing")) {
    return "Lanzar Beta";
  }

  if (venture.productPRD) {
    return "Revisar PRD";
  }

  return "Abrir workspace";
}

function ventureHref(venture: VentureProject): string {
  if (venture.status === "ready") return `/venture/${venture.id}`;
  if (venture.status === "building") return `/build/${venture.id}`;
  return `/intelligence/${venture.id}`;
}

export function buildPortfolioVentureCard(venture: VentureProject): PortfolioVentureCard {
  const scores = resolveScores(venture);
  const { status, label } = resolveGeneralStatus(venture, scores.ventureScore);

  return {
    id: venture.id,
    name: venture.name,
    shortDescription:
      venture.description?.slice(0, 140) ||
      venture.ideaText.slice(0, 140) + (venture.ideaText.length > 140 ? "…" : ""),
    generalStatus: status,
    generalStatusLabel: label,
    startupScore: scores.startupScore,
    ventureScore: scores.ventureScore,
    confidence: scores.confidence,
    confidenceLabel:
      scores.confidence.charAt(0).toUpperCase() + scores.confidence.slice(1),
    lastUpdated: venture.updatedAt,
    lastUpdatedRelative: formatRelativeTime(venture.updatedAt),
    nextAction: deriveNextAction(venture),
    pipeline: buildPipeline(venture),
    href: ventureHref(venture),
    category: venture.category,
  };
}

export function buildPortfolioSummary(ventures: VentureProject[]): PortfolioSummaryMetrics {
  let mvpsActivos = 0;
  let produccion = 0;
  let horasAhorradas = 0;

  for (const v of ventures) {
    const scores = resolveScores(v);
    const isMvp =
      v.status === "ready" ||
      (v.status === "building" && !!v.productPRD) ||
      !!v.productPRD;
    const isProd = v.status === "ready" && scores.ventureScore >= 55;

    if (isMvp) mvpsActivos += 1;
    if (isProd) produccion += 1;

    let hours = 1.5;
    if (v.discoveryContext?.answers.length) hours += 0.5;
    if (v.researchReport) hours += 3;
    if (v.productPRD) hours += 2.5;
    if (v.sections.length) hours += v.sections.length * 0.25;
    if (v.status === "ready") hours += 2;
    horasAhorradas += Math.round(hours);
  }

  return {
    totalEmpresas: ventures.length,
    mvpsActivos,
    produccion,
    horasAhorradas,
  };
}
