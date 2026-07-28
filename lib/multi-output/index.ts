/** PROGRAM 5390 — Multi-Output Mission public API. */

export type * from "./types";
export {
  MULTI_OUTPUT_VERSION,
  OUTPUT_KIND_LABELS,
  OUTPUT_KIND_ICONS,
  KIND_TO_CREATION_OUTPUT,
  ALL_OUTPUT_KINDS,
} from "./types";

export {
  OFFICIAL_DEPENDENCIES,
  getDependenciesFor,
  getDependentsOf,
  getDirectDependencies,
  topologicalSort,
  canRunInParallel,
  getTransitiveDependents,
} from "./output-dependency-graph";

export { selectOutputsByIntent } from "./output-selector";
export type { OutputSelection, SelectionResult } from "./output-selector";

export {
  createMultiOutputPlan,
  acceptPlan,
  modifyPlanOutputs,
  getMultiOutputPlan,
  saveMultiOutputPlan,
  getActiveOutputKinds,
  getCreationOutputTypesFromPlan,
} from "./multi-output-plan";

export {
  buildSharedContextFromSession,
  exportDesignTokenPackage,
  exportApiContracts,
  suggestMonorepoStructure,
  getSharedContext,
  saveSharedContext,
  updateSharedContextField,
} from "./shared-context";
export type { SharedContext, BrandIdentity, PricingModel, ApiContract } from "./shared-context";

export {
  analyzeImpact,
  analyzeCustomImpact,
  formatImpactSummary,
  DOCUMENTED_SCENARIOS,
} from "./output-impact-analysis";
export type { ChangeScenario } from "./output-impact-analysis";

export {
  mapCreationStatusToPlanned,
  updateOutputStatus,
  syncPlanFromCreationOutputs,
  markOutputBlocked,
  markOutputFailed,
  buildMultiOutputSummary,
  getOutputsByStatus,
  countByStatus,
  isPlanReadyForGeneration,
  isPlanComplete,
} from "./output-status";

export {
  planOutputsForSession,
  acceptOutputPlan,
  orchestrateMultiOutput,
  generateApprovedOutputs,
  getOrchestrationBatches,
} from "./output-coordinator";
export type { OrchestrationResult, GenerationBatch } from "./output-coordinator";

export {
  syncAffectedOutputs,
  syncPricingChange,
  syncTargetCustomerChange,
  syncRemoveMobile,
  getSyncPreview,
} from "./output-sync";

export {
  runNexoraMultiOutputE2E,
  NEXORA_MULTI_OUTPUT_MISSION_ID,
  getNexoraMultiOutputStudioHref,
  getNexoraMissionControlHref,
} from "./e2e-nexora-multi-output";

export async function loadMultiOutputSummaryServer(missionId: string, ventureSlug?: string) {
  const { getMultiOutputPlan, createMultiOutputPlan, acceptPlan, saveMultiOutputPlan } = await import("./multi-output-plan");
  const { buildMultiOutputSummary } = await import("./output-status");
  const { createMissionSession } = await import("@/lib/mission-control/mission-session");

  let plan = getMultiOutputPlan(missionId);
  if (!plan) {
    const session = createMissionSession();
    session.missionId = missionId;
    session.ventureSlug = ventureSlug;
    plan = acceptPlan(createMultiOutputPlan(session));
    saveMultiOutputPlan(plan);
  }

  return buildMultiOutputSummary(plan);
}

export async function ensureMultiOutputPlan(missionId: string, ideaText?: string, ventureSlug?: string) {
  const { getMultiOutputPlan, createMultiOutputPlan, saveMultiOutputPlan } = await import("./multi-output-plan");
  const { createMissionSession } = await import("@/lib/mission-control/mission-session");

  let plan = getMultiOutputPlan(missionId);
  if (plan) return plan;

  const session = createMissionSession(ideaText);
  session.missionId = missionId;
  session.ventureSlug = ventureSlug;
  if (ideaText) {
    session.intent = { primary: "VENTURE", confidence: 0.8, extractedIdea: ideaText };
  }
  plan = createMultiOutputPlan(session);
  saveMultiOutputPlan(plan);
  return plan;
}
