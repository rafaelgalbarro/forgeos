/** PROGRAM 5350 — Creation Output Studio public API. */

export type * from "./types";
export {
  CREATION_OUTPUT_VERSION,
  ALL_OUTPUT_TYPES,
  OUTPUT_TYPE_LABELS,
  OUTPUT_TYPE_ICONS,
} from "./types";

export { getOutputRepository, seedMemoryOutputs } from "./output-repository";
export {
  createOutputId,
  getLatestOutputByType,
  getAllLatestOutputs,
  getOutputVersions,
  registerOutput,
  registerOutputs,
  buildMissionOutputSummary,
  buildStudioSnapshot,
  hasAnyOutputs,
} from "./output-registry";
export { buildAllOutputs, ensureMissionOutputs } from "./output-builder";
export { validateOutput, applyValidation } from "./output-validator";
export { bumpVersion, createNewVersion, compareVersions, getVersionHistory } from "./output-versioning";
export { createChangeRequest, approveOutput, getOpenChangeRequests } from "./change-requests";
export { runNexoraFieldE2EPipeline, NEXORA_E2E_MISSION_ID, getNexoraStudioHref } from "./e2e-nexora-pipeline";
export { buildGenericDemoScenario, WEBSITE_DEMO_PAGES, MOBILE_DEMO_SCREENS } from "./demo-fixtures";

export async function loadStudioSnapshotServer(missionId: string, ventureSlug?: string) {
  const { runNexoraFieldE2EPipeline, NEXORA_E2E_MISSION_ID } = await import("./e2e-nexora-pipeline");
  const { runNexoraMultiOutputE2E, NEXORA_MULTI_OUTPUT_MISSION_ID } = await import("@/lib/multi-output/e2e-nexora-multi-output");
  const { buildStudioSnapshot } = await import("./output-registry");
  const { seedMemoryOutputs } = await import("./output-repository");

  if (missionId === NEXORA_MULTI_OUTPUT_MISSION_ID || (missionId.includes("nexora") && missionId.includes("5390"))) {
    const result = await runNexoraMultiOutputE2E();
    const outputs = result.plan.outputs.length > 0
      ? await ensureOutputsFromPlan(missionId, ventureSlug)
      : [];
    seedMemoryOutputs(outputs);
  } else if (missionId === NEXORA_E2E_MISSION_ID || ventureSlug === "nexora-field") {
    const result = await runNexoraFieldE2EPipeline();
    seedMemoryOutputs(result.outputs);
  } else {
    const { ensureMissionOutputs } = await import("./output-builder");
    const outputs = await ensureMissionOutputs(missionId, ventureSlug);
    seedMemoryOutputs(outputs);
  }

  return buildStudioSnapshot(missionId, ventureSlug);
}

async function ensureOutputsFromPlan(missionId: string, ventureSlug?: string) {
  const { ensureMissionOutputs } = await import("./output-builder");
  return ensureMissionOutputs(missionId, ventureSlug ?? "nexora-field");
}

export async function loadMissionOutputSummaryServer(
  missionId: string,
  ventureSlug?: string,
  ventureId?: string
) {
  await loadStudioSnapshotServer(missionId, ventureSlug);
  const { buildMissionOutputSummary } = await import("./output-registry");
  return buildMissionOutputSummary(missionId, ventureSlug, ventureId);
}
