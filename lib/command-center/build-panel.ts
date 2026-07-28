/** Program 4500 — Build & deploy panel. */

import { getBuildPipelinePolicySnapshot } from "@/lib/build-pipeline/policy-snapshot";
import { getBuildPipelineSnapshot } from "@/lib/build-pipeline/pipeline-orchestrator";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import type { BuildPanelData } from "./types";

export function buildBuildPanelSync(): BuildPanelData {
  const policy = getBuildPipelinePolicySnapshot();
  return {
    lastBuildLabel: policy.defaultMode === "dry_run" ? "Último: dry-run" : "Build real",
    deployPreview: policy.previewOnly ? "Preview only" : "—",
    rollbackReady: true,
    approvalRequired: policy.requireApproval,
    mode: policy.defaultMode,
    href: "/deployments",
  };
}

export async function buildBuildPanelAsync(ventureId?: string): Promise<BuildPanelData> {
  const base = buildBuildPanelSync();
  try {
    const snap = await getBuildPipelineSnapshot(ventureId ?? VANDL_VENTURE_ID, "command-center");
    return {
      ...base,
      lastBuildLabel: snap.buildReport
        ? `${snap.buildReport.stagesCompleted}/${snap.buildReport.stagesTotal} etapas`
        : `Pipeline ${snap.mode}`,
      deployPreview: snap.deployPreviewPlan?.previewUrl ?? snap.deployPreviewPlan?.summary ?? base.deployPreview,
      rollbackReady: !!snap.rollbackPlan,
      mode: snap.mode,
    };
  } catch {
    return base;
  }
}
