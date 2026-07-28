/** Program 10000 — Generic Venture E2E engine (orchestrator). */

import type { VentureProject } from "@/lib/domain/venture";
import { runCeoEngine } from "@/lib/ceo";
import { runFos } from "@/lib/fos";
import { processExecutiveMeshRequest } from "@/lib/executive-mesh";
import { getDepartment } from "@/lib/executive-mesh/departments";
import { buildBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import { getBuildPipelineSnapshot } from "@/lib/build-pipeline";
import { buildVentureIntelligenceSnapshot } from "@/lib/venture-intelligence";
import { computeFounderJourney } from "@/lib/founder-journey";
import {
  buildVentureScoreBreakdown,
  ventureToIntelligenceInputs,
  REUSED_MODULES,
} from "@/lib/founder-zero";
import { computeVentureHealth } from "@/lib/founder-zero/venture-health";
import type { ValidationStage } from "@/lib/founder-zero/types";
import { E2E_DEPARTMENT_IDS } from "./pipeline-stages";
import { buildE2EChecklist } from "./venture-checklist";
import { computeE2EProgress } from "./venture-progress";
import { computeE2EReadiness } from "./venture-readiness";
import { generateE2EReports } from "./venture-report";
import { isValidVentureProject, resolveVentureFixture } from "./fixture-registry";
import type {
  E2ECeoBrief,
  E2EDepartmentContribution,
  E2EStage,
  VentureE2ESnapshot,
} from "./types";
import { VENTURE_E2E_DISCLAIMER, VENTURE_E2E_VERSION } from "./types";

function mapHealth(stages: E2EStage[]) {
  return computeVentureHealth(stages as unknown as ValidationStage[]);
}

function buildCeoBrief(
  venture: VentureProject,
  ceoEngine: ReturnType<typeof runCeoEngine>,
  progressPercent: number
): E2ECeoBrief {
  const summary = ceoEngine.executiveSummary;
  const journey = computeFounderJourney(venture);
  const journeyNext =
    journey.phases.find((p) => p.status === "active")?.nextAction?.label ??
    journey.summary.currentPhaseLabel;

  return {
    executiveSummary:
      `${venture.name}: pipeline E2E al ${progressPercent}%. ` +
      summary.ceoMessage +
      ` Prioridad: ${summary.topPriority}.`,
    currentRisks: ceoEngine.criticalRisks.map((r) => r.label).slice(0, 5),
    recommendations: [ceoEngine.recommendation.action, ceoEngine.recommendation.rationale]
      .filter(Boolean)
      .slice(0, 5),
    nextActions: [
      ceoEngine.topPriority?.action ?? "Completar etapas pendientes del pipeline",
      venture.productPRD?.mvpScope?.[0] ? `MVP: ${venture.productPRD.mvpScope[0]}` : "",
      journeyNext,
    ]
      .filter(Boolean)
      .slice(0, 4),
    overallReadiness:
      progressPercent >= 75
        ? "Listo para siguiente fase"
        : progressPercent >= 50
          ? "En progreso sólido"
          : "Requiere más validación",
    confidenceScore: Math.min(
      95,
      Math.round((venture.intelligenceReport?.startupScore ?? 60) * 0.85 + progressPercent * 0.15)
    ),
  };
}

function buildDepartmentContributions(
  venture: VentureProject,
  stages: E2EStage[]
): E2EDepartmentContribution[] {
  const stageByDept: Record<string, string[]> = {
    research: ["research", "competitors", "market"],
    product: ["prd", "idea"],
    finance: ["business-model", "pricing"],
    cmo: ["brand", "landing", "go-to-market"],
    legal: ["launch-checklist"],
    architecture: ["architecture"],
    backend: ["architecture", "build-context"],
    qa: ["launch-checklist"],
    growth: ["go-to-market", "landing"],
    capital: ["investor-readiness"],
  };

  return E2E_DEPARTMENT_IDS.map((deptId) => {
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

export async function runVentureE2EEngine(
  idOrSlug: string
): Promise<VentureE2ESnapshot> {
  const fixture = resolveVentureFixture(idOrSlug);
  if (!fixture || !isValidVentureProject(fixture.venture)) {
    throw new Error(`Venture fixture no encontrado: ${idOrSlug}`);
  }

  const venture = fixture.venture;
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
    buildPipeline = await getBuildPipelineSnapshot(venture.id, "venture-e2e");
  } catch {
    buildPipeline = null;
  }

  let mesh = null;
  try {
    mesh = await processExecutiveMeshRequest(
      {
        ventureId: venture.id,
        ventureName: venture.name,
        topic: `Pipeline E2E — ${venture.name}`,
        urgency: "medium",
      },
      venture
    );
  } catch {
    mesh = null;
  }

  const stages = buildE2EChecklist(venture, {
    buildContext,
    buildDna,
    pipeline: buildPipeline,
    intelligence,
  });
  const progress = computeE2EProgress(stages);
  const health = mapHealth(stages);
  const scores = buildVentureScoreBreakdown(
    venture,
    intelligence,
    stages as unknown as ValidationStage[]
  );
  const readiness = computeE2EReadiness(stages, scores, intelligence);
  const ceo = buildCeoBrief(venture, ceoEngine, progress.percent);
  const departments = buildDepartmentContributions(venture, stages);
  const reports = generateE2EReports(
    venture.name,
    stages,
    scores,
    readiness,
    ceo,
    REUSED_MODULES
  );

  return {
    version: VENTURE_E2E_VERSION,
    disclaimer: VENTURE_E2E_DISCLAIMER,
    venture,
    ventureSlug: fixture.slug,
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
    computedAt: new Date().toISOString(),
  };
}

export { REUSED_MODULES };
