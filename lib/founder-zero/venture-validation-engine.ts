/** Program 4000 — Venture Validation Engine (main orchestrator). */

import type { VentureProject } from "@/lib/domain/venture";
import { VANDL_VENTURE, VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { runCeoEngine } from "@/lib/ceo";
import { runFos } from "@/lib/fos";
import { processExecutiveMeshRequest } from "@/lib/executive-mesh";
import { getDepartment } from "@/lib/executive-mesh/departments";
import { buildBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import { getBuildPipelineSnapshot } from "@/lib/build-pipeline";
import { buildVentureIntelligenceSnapshot } from "@/lib/venture-intelligence";
import { computeFounderJourney } from "@/lib/founder-journey";
import { getVentureById } from "@/lib/store/ventures";
import { FOUNDER_ZERO_DEPARTMENT_IDS } from "./pipeline-stages";
import { buildValidationChecklist } from "./venture-checklist";
import { computeValidationProgress } from "./venture-progress";
import { computeVentureHealth } from "./venture-health";
import { buildVentureScoreBreakdown, ventureToIntelligenceInputs } from "./venture-score";
import { computeReadinessLevels } from "./venture-readiness";
import { generateValidationReports } from "./venture-report";
import { readValidationHistory, appendValidationHistory } from "./venture-history";
import type {
  CeoValidationBrief,
  DepartmentContribution,
  FounderZeroSnapshot,
  ReusedModuleRef,
} from "./types";
import {
  FOUNDER_ZERO_DISCLAIMER,
  FOUNDER_ZERO_VERSION,
} from "./types";

export const REUSED_MODULES: ReusedModuleRef[] = [
  { id: "runtime", label: "Runtime", path: "lib/runtime", role: "Execution dispatch" },
  { id: "mesh", label: "Executive Mesh", path: "lib/executive-mesh", role: "Department collaboration" },
  { id: "ai-runtime", label: "AI Runtime", path: "lib/ai-runtime", role: "Research, PRD, prompts" },
  { id: "prompt-compiler", label: "Prompt Compiler", path: "lib/ai-runtime/prompt-compiler", role: "Prompt assembly" },
  { id: "context-engine", label: "Context Engine", path: "lib/ai-runtime/context-engine", role: "Workspace context" },
  { id: "model-router", label: "Model Router", path: "lib/ai-runtime/router", role: "Provider routing" },
  { id: "skills", label: "Skills", path: "lib/skills", role: "Capability execution" },
  { id: "capabilities", label: "Capability Layer", path: "lib/capabilities", role: "Skill orchestration" },
  { id: "build-flow", label: "Real Build Flow", path: "lib/real-build-flow", role: "Build dry-run" },
  { id: "execution", label: "Real Execution", path: "lib/real-execution", role: "Approval gates" },
  { id: "venture-factory", label: "Venture Factory", path: "lib/venture-factory", role: "Venture creation stages" },
  { id: "intelligence", label: "Venture Intelligence", path: "lib/venture-intelligence", role: "Scoring & investor readiness" },
  { id: "self-evolution", label: "Self Evolution", path: "lib/self-evolution", role: "Quality observations" },
  { id: "organization", label: "Organization", path: "lib/organization", role: "Org structure" },
  { id: "marketplace", label: "Marketplace", path: "lib/marketplace", role: "Ecosystem" },
  { id: "enterprise", label: "Enterprise", path: "lib/enterprise", role: "Enterprise features" },
  { id: "ceo", label: "CEO Engine", path: "lib/ceo", role: "Executive summary & risks" },
  { id: "fos", label: "FOS Kernel", path: "lib/fos", role: "Portfolio orchestration" },
  { id: "build-context", label: "Build Context", path: "lib/build-platform/build-context", role: "Build context assembly" },
  { id: "build-dna", label: "Build DNA", path: "lib/build-platform/build-dna", role: "Stack DNA" },
  { id: "build-pipeline", label: "Build Pipeline", path: "lib/build-pipeline", role: "Deploy preview" },
  { id: "founder-journey", label: "Founder Journey", path: "lib/founder-journey", role: "Onboarding flow" },
];

function resolveValidationVenture(ventureId?: string): VentureProject {
  if (ventureId) {
    const stored = getVentureById(ventureId);
    if (stored) return stored;
    if (ventureId === VANDL_VENTURE_ID || ventureId === "vandl") return VANDL_VENTURE;
  }
  return getVentureById(VANDL_VENTURE_ID) ?? VANDL_VENTURE;
}

function buildCeoBrief(
  venture: VentureProject,
  ceoEngine: ReturnType<typeof runCeoEngine>,
  progressPercent: number
): CeoValidationBrief {
  const summary = ceoEngine.executiveSummary;
  const journey = computeFounderJourney(venture);
  const journeyNext =
    journey.phases.find((p) => p.status === "active")?.nextAction?.label ??
    journey.summary.currentPhaseLabel;

  return {
    executiveSummary:
      `${venture.name}: validación Founder Zero al ${progressPercent}%. ` +
      summary.ceoMessage +
      ` Prioridad: ${summary.topPriority}.`,
    currentRisks: ceoEngine.criticalRisks.map((r) => r.label).slice(0, 5),
    recommendations: [
      ceoEngine.recommendation.action,
      ceoEngine.recommendation.rationale,
    ].filter(Boolean).slice(0, 5),
    nextActions: [
      ceoEngine.topPriority?.action ?? "Completar etapas pendientes del pipeline",
      venture.productPRD?.mvpScope?.[0] ? `MVP: ${venture.productPRD.mvpScope[0]}` : "",
      journeyNext,
    ].filter(Boolean).slice(0, 4),
    overallReadiness:
      progressPercent >= 75 ? "Listo para siguiente fase" : progressPercent >= 50 ? "En progreso sólido" : "Requiere más validación",
    confidenceScore: Math.min(95, Math.round((venture.intelligenceReport?.startupScore ?? 60) * 0.85 + progressPercent * 0.15)),
  };
}

function buildDepartmentContributions(
  venture: VentureProject,
  stages: FounderZeroSnapshot["stages"]
): DepartmentContribution[] {
  const stageByDept: Record<string, string[]> = {
    research: ["research", "competitors", "market"],
    product: ["prd", "idea"],
    finance: ["business-model", "pricing"],
    cmo: ["brand", "landing", "go-to-market"],
    legal: ["launch-checklist"],
    architecture: ["architecture"],
    backend: ["backend-plan", "database-plan"],
    qa: ["launch-checklist"],
    growth: ["go-to-market", "landing"],
    capital: ["investor-readiness"],
  };

  return FOUNDER_ZERO_DEPARTMENT_IDS.map((deptId) => {
    const dept = getDepartment(deptId);
    const related = stages.filter((s) => stageByDept[deptId]?.includes(s.id));
    const completed = related.filter((s) => s.status === "completed");
    const risks = [...new Set(related.flatMap((s) => s.risks))].slice(0, 3);
    const pending = [...new Set(related.flatMap((s) => s.pending))].slice(0, 3);
    const recommendations = [...new Set(related.flatMap((s) => s.recommendations))].slice(0, 2);

    return {
      departmentId: deptId,
      label: dept?.label ?? deptId,
      result:
        completed.length > 0
          ? `${completed.length}/${related.length} etapas completadas para ${venture.name}`
          : related.length > 0
            ? `Participación en ${related.map((s) => s.label).join(", ")}`
            : "Sin etapas asignadas en este ciclo",
      risks,
      pending,
      recommendations,
    };
  });
}

export async function runVentureValidationEngine(
  ventureId?: string
): Promise<FounderZeroSnapshot> {
  const venture = resolveValidationVenture(ventureId);
  const ventures = [venture];

  const fos = runFos(ventures);
  const ceoEngine = runCeoEngine(ventures, fos);

  let intelligence = null;
  try {
    intelligence = buildVentureIntelligenceSnapshot(ventureToIntelligenceInputs(venture));
  } catch {
    intelligence = null;
  }

  let buildContext = null;
  try {
    buildContext = buildBuildContextFromVenture(venture);
  } catch {
    buildContext = null;
  }

  let buildDna = null;
  if (buildContext) {
    try {
      buildDna = createBuildDnaFromContext(buildContext);
    } catch {
      buildDna = null;
    }
  }

  let buildPipeline = null;
  try {
    buildPipeline = await getBuildPipelineSnapshot(venture.id, "founder-zero");
  } catch {
    buildPipeline = null;
  }

  let mesh = null;
  try {
    mesh = await processExecutiveMeshRequest(
      {
        ventureId: venture.id,
        ventureName: venture.name,
        topic: `Validación Founder Zero — ${venture.name}`,
        urgency: "medium",
      },
      venture
    );
  } catch {
    mesh = null;
  }

  const stages = buildValidationChecklist(venture, {
    buildContext,
    buildDna,
    pipeline: buildPipeline,
    intelligence,
  });
  const progress = computeValidationProgress(stages);
  const health = computeVentureHealth(stages);
  const scores = buildVentureScoreBreakdown(venture, intelligence, stages);
  const readiness = computeReadinessLevels(stages, scores, intelligence);
  const ceo = buildCeoBrief(venture, ceoEngine, progress.percent);
  const departments = buildDepartmentContributions(venture, stages);
  const reports = generateValidationReports(
    venture.name,
    stages,
    scores,
    readiness,
    ceo,
    REUSED_MODULES
  );

  appendValidationHistory({
    ventureId: venture.id,
    ventureName: venture.name,
    ranAt: new Date().toISOString(),
    overallScore: scores.overallVentureScore,
    completedStages: progress.completedCount,
    totalStages: progress.totalCount,
  });

  return {
    version: FOUNDER_ZERO_VERSION,
    disclaimer: FOUNDER_ZERO_DISCLAIMER,
    venture,
    stages,
    progress,
    health,
    scores,
    readiness,
    ceo,
    departments,
    intelligence,
    buildContext,
    buildDna,
    buildPipeline,
    mesh,
    ceoEngine,
    reports,
    reusedModules: REUSED_MODULES,
    history: readValidationHistory(),
    computedAt: new Date().toISOString(),
  };
}

export function runFounderZeroLab(ventureId?: string): Promise<FounderZeroSnapshot> {
  return runVentureValidationEngine(ventureId ?? VANDL_VENTURE_ID);
}
