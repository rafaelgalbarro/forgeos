/** Server-safe venture page snapshot — no Skills/Capabilities/AI engines on paint. */

import type { VentureProject } from "@/lib/domain/venture";
import { getVentureHealth } from "@/lib/health";
import { formatRelativeTime } from "@/lib/portfolio/time-utils";
import { resolveScores } from "@/lib/portfolio/venture-status";
import {
  isValidVentureProject,
  resolveVentureFixture,
} from "@/lib/venture-e2e/fixture-registry";
import { E2E_PIPELINE } from "@/lib/venture-e2e/pipeline-stages";
import { computeE2EProgress } from "@/lib/venture-e2e/venture-progress";
import type {
  E2ECeoBrief,
  E2EDepartmentContribution,
  E2EReadiness,
  E2EStage,
  E2EVentureHealth,
  E2EVentureScores,
  VentureE2ESnapshot,
} from "@/lib/venture-e2e/types";
import {
  VENTURE_E2E_DISCLAIMER,
  VENTURE_E2E_VERSION,
} from "@/lib/venture-e2e/types";

export interface VenturePageSummary {
  venture: VentureProject;
  ventureSlug: string;
  score: number;
  readiness: string;
  health: E2EVentureHealth;
  recentActivity: string;
  pendingDecisions: string[];
  buildSummary: { mode: string; label: string; href: string };
}

function hasSection(venture: VentureProject, id: string): boolean {
  return venture.sections.some((s) => s.id === id && s.content.trim().length > 0);
}

function lightStageStatus(
  id: E2EStage["id"],
  venture: VentureProject
): Pick<E2EStage, "status" | "resultSummary" | "risks" | "pending" | "recommendations"> {
  const rr = venture.researchReport;
  const prd = venture.productPRD;

  switch (id) {
    case "idea":
      return venture.ideaText?.trim()
        ? { status: "completed", resultSummary: venture.ideaText.slice(0, 120), risks: [], pending: [], recommendations: [] }
        : { status: "not_started", resultSummary: "Sin idea definida", risks: ["Sin propuesta de valor"], pending: ["Definir idea"], recommendations: [] };
    case "research":
      return rr
        ? { status: "completed", resultSummary: "Research disponible", risks: [], pending: [], recommendations: [] }
        : { status: "in_progress", resultSummary: "Research pendiente", risks: [], pending: ["Ejecutar research"], recommendations: [] };
    case "prd":
      return prd
        ? { status: "completed", resultSummary: "PRD generado", risks: [], pending: [], recommendations: [] }
        : { status: "not_started", resultSummary: "PRD no generado", risks: [], pending: ["Generar PRD"], recommendations: [] };
    case "architecture":
      return hasSection(venture, "architecture")
        ? { status: "completed", resultSummary: "Arquitectura documentada", risks: [], pending: [], recommendations: [] }
        : { status: "not_started", resultSummary: "Arquitectura pendiente", risks: [], pending: ["Definir arquitectura"], recommendations: [] };
    case "build-context":
      return hasSection(venture, "backend") || hasSection(venture, "frontend")
        ? { status: "in_progress", resultSummary: "Secciones técnicas presentes", risks: [], pending: ["Completar build context"], recommendations: [] }
        : { status: "not_started", resultSummary: "Build context pendiente", risks: [], pending: ["Iniciar build context"], recommendations: [] };
    default:
      return {
        status: "not_started",
        resultSummary: "Pendiente de evaluación completa",
        risks: [],
        pending: ["Ejecutar pipeline E2E"],
        recommendations: [],
      };
  }
}

function buildLightStages(venture: VentureProject): E2EStage[] {
  return E2E_PIPELINE.map((def) => {
    const slice = lightStageStatus(def.id, venture);
    return {
      id: def.id,
      label: def.label,
      order: def.order,
      moduleUsed: def.moduleUsed,
      ...slice,
    };
  });
}

function buildLightScores(venture: VentureProject): E2EVentureScores {
  const resolved = resolveScores(venture);
  const base = resolved.ventureScore ?? resolved.startupScore ?? 55;
  return {
    marketScore: Math.min(100, base + 5),
    businessScore: Math.min(100, base),
    executionScore: Math.min(100, base - 5),
    productScore: venture.productPRD ? Math.min(100, base + 8) : Math.max(20, base - 15),
    financialScore: Math.min(100, base - 3),
    growthScore: Math.min(100, base - 8),
    riskScore: Math.max(10, 100 - base),
    overallVentureScore: base,
  };
}

function buildLightReadiness(stages: E2EStage[], scores: E2EVentureScores): E2EReadiness {
  const has = (id: E2EStage["id"]) => stages.find((s) => s.id === id)?.status === "completed";
  const completedRatio = stages.filter((s) => s.status === "completed").length / Math.max(1, stages.length);
  const prototypeScore = Math.round(completedRatio * 100);
  return {
    prototypeReady: has("prd"),
    mvpReady: has("architecture"),
    betaReady: has("build-context"),
    investorReady: scores.businessScore >= 60,
    launchReady: scores.overallVentureScore >= 70 && has("launch-checklist"),
    prototypeScore,
    mvpScore: Math.round(prototypeScore * 0.85),
    betaScore: Math.round(prototypeScore * 0.7),
    investorScore: scores.businessScore,
    launchScore: Math.round(prototypeScore * 0.6),
  };
}

function buildLightCeoBrief(venture: VentureProject, progressPercent: number): E2ECeoBrief {
  return {
    executiveSummary: `${venture.name}: snapshot ligero al ${progressPercent}%. Usa «Re-ejecutar pipeline» para análisis completo.`,
    currentRisks: venture.researchReport ? [] : ["Research pendiente"],
    recommendations: ["Completar etapas del pipeline E2E"],
    nextActions: [
      venture.productPRD?.mvpScope?.[0] ? `MVP: ${venture.productPRD.mvpScope[0]}` : "Definir MVP",
      "Revisar readiness del venture",
    ].filter(Boolean),
    overallReadiness:
      progressPercent >= 75 ? "Listo para siguiente fase" : progressPercent >= 50 ? "En progreso" : "Requiere validación",
    confidenceScore: Math.min(90, Math.round(50 + progressPercent * 0.4)),
  };
}

function buildLightHealth(venture: VentureProject, stages: E2EStage[], score: number): E2EVentureHealth {
  const health = getVentureHealth(venture);
  const blockers = stages.filter((s) => s.status === "blocked").map((s) => s.label);
  return {
    score,
    label: health.categoryLabel,
    blockers,
    warnings: stages.filter((s) => s.status === "not_started").slice(0, 3).map((s) => s.label),
  };
}

export function loadVenturePageSummary(slug: string): VenturePageSummary | null {
  const fixture = resolveVentureFixture(slug);
  if (!fixture || !isValidVentureProject(fixture.venture)) return null;

  const venture = fixture.venture;
  const stages = buildLightStages(venture);
  const progress = computeE2EProgress(stages);
  const scores = buildLightScores(venture);
  const readiness = buildLightReadiness(stages, scores);
  const health = buildLightHealth(venture, stages, scores.overallVentureScore);

  return {
    venture,
    ventureSlug: fixture.slug,
    score: scores.overallVentureScore,
    readiness: readiness.launchReady ? "Launch-ready" : readiness.mvpReady ? "MVP en curso" : "Discovery",
    health,
    recentActivity: formatRelativeTime(venture.updatedAt),
    pendingDecisions: stages
      .filter((s) => s.pending.length > 0)
      .flatMap((s) => s.pending)
      .slice(0, 5),
    buildSummary: {
      mode: "dry_run",
      label: "Build pipeline — snapshot",
      href: "/deployments",
    },
  };
}

/** Full dashboard snapshot shape for initial paint (heavy fields null). */
export function loadVenturePageSnapshot(slug: string): VentureE2ESnapshot | null {
  const summary = loadVenturePageSummary(slug);
  if (!summary) return null;

  const stages = buildLightStages(summary.venture);
  const progress = computeE2EProgress(stages);
  const scores = buildLightScores(summary.venture);
  const readiness = buildLightReadiness(stages, scores);
  const ceo = buildLightCeoBrief(summary.venture, progress.percent);

  const departments: E2EDepartmentContribution[] = [];

  return {
    version: VENTURE_E2E_VERSION,
    disclaimer: VENTURE_E2E_DISCLAIMER,
    venture: summary.venture,
    ventureSlug: summary.ventureSlug,
    stages,
    progress,
    health: summary.health,
    scores,
    readiness,
    ceo,
    departments,
    intelligence: null,
    buildContext: null,
    buildDna: null,
    buildPipeline: null,
    mesh: null,
    ceoEngine: null,
    reports: {
      executive: ceo.executiveSummary,
      businessPlan: "Disponible tras ejecutar pipeline completo.",
      technicalArchitecture: "Disponible tras ejecutar pipeline completo.",
      investorReadiness: `Score estimado: ${readiness.investorScore}`,
      launchPlan: "Disponible tras ejecutar pipeline completo.",
    },
    reusedModules: [],
    computedAt: new Date().toISOString(),
  };
}
