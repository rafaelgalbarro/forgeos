/** ForgeOS Build Pipeline — GitHub adapter (wraps real-build-flow). */

import { runGitHubBuildStep } from "@/lib/real-build-flow/github-step";
import type { BuildFlowEnvironment, BuildFlowStepResult } from "@/lib/real-build-flow/types";
import type { PipelineMode } from "./types";

export interface PipelineGitHubInput {
  ventureId: string;
  ventureName: string;
  requestedBy: string;
  repoName: string;
  mode: PipelineMode;
  approvalSessionId?: string;
  step: "github_repo" | "github_branch" | "project_scaffold";
}

function toBuildFlowEnvironment(mode: PipelineMode): BuildFlowEnvironment {
  if (mode === "dry_run") return "dry_run";
  return "preview";
}

export async function runPipelineGitHubStep(
  input: PipelineGitHubInput
): Promise<BuildFlowStepResult> {
  return runGitHubBuildStep({
    ventureId: input.ventureId,
    ventureName: input.ventureName,
    requestedBy: input.requestedBy,
    repoName: input.repoName,
    environment: toBuildFlowEnvironment(input.mode),
    approvalSessionId: input.approvalSessionId,
    step: input.step,
  });
}
