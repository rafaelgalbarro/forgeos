/** ForgeOS Platform CEO — AI adapter (Epic 3.1). */

import type { VentureProject } from "@/lib/domain/venture";
import { getDecisionsForVenture } from "@/lib/intelligence-layer/decision-engine";
import { getVentureMemory } from "@/lib/intelligence-layer/venture-memory";
import { runOrchestratedAiTask } from "@/lib/ai-orchestration/task-runner";
import type {
  CeoOutput,
  OrchestratedAiResult,
  OrchestrationTaskId,
  VentureOrchestrationContext,
} from "@/lib/ai-orchestration/types";

export type CeoAiTaskId = Extract<
  OrchestrationTaskId,
  "CEO_BRIEF" | "CEO_PRIORITY" | "CEO_RISK" | "CEO_REVIEW"
>;

export function buildCeoVentureContext(
  venture: VentureProject,
  extra?: Partial<VentureOrchestrationContext>
): VentureOrchestrationContext {
  return {
    venture,
    ventureId: venture.id,
    idea: venture.ideaText,
    discoveryContext: venture.discoveryContext ?? null,
    researchReport: venture.researchReport ?? null,
    productPRD: venture.productPRD ?? null,
    ventureSimulatorResult: venture.ventureSimulatorResult ?? null,
    decisionGraph: getDecisionsForVenture(venture.id),
    ventureMemory: getVentureMemory(venture.id) ?? null,
    ...extra,
  };
}

export async function runCeoAiTask(
  task: CeoAiTaskId,
  ventureContext: VentureOrchestrationContext | VentureProject
): Promise<OrchestratedAiResult<CeoOutput>> {
  const ctx =
    "id" in ventureContext && "sections" in ventureContext
      ? buildCeoVentureContext(ventureContext)
      : ventureContext;

  return runOrchestratedAiTask<CeoOutput>(task, ctx);
}
