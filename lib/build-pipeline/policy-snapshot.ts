/** Lightweight build pipeline policy — no orchestrator / skills imports. */

import type { BuildPipelinePolicy } from "./types";

function envTrue(key: string): boolean {
  return process.env[key] === "true";
}

/** Sync policy snapshot for UI panels — reads env only. */
export function getBuildPipelinePolicySnapshot(): BuildPipelinePolicy {
  return {
    enableRealBuildFlow: envTrue("ENABLE_REAL_BUILD_FLOW"),
    enableRealExecution: envTrue("ENABLE_REAL_EXECUTION"),
    requireApproval: process.env.REAL_EXECUTION_REQUIRE_APPROVAL !== "false",
    defaultMode: "dry_run",
    previewOnly: true,
    productionBlocked: true,
  };
}
