/** ForgeOS Build Pipeline — Vercel adapter (wraps real-build-flow). */

import { runVercelBuildStep } from "@/lib/real-build-flow/vercel-step";
import type { BuildFlowStepResult } from "@/lib/real-build-flow/types";
import type { PipelineMode } from "./types";

export interface PipelineVercelInput {
  ventureId: string;
  ventureName: string;
  requestedBy: string;
  mode: PipelineMode;
  approvalSessionId?: string;
}

function toEnvironment(mode: PipelineMode): "preview" | "sandbox" | "dry_run" {
  if (mode === "dry_run") return "dry_run";
  return "preview";
}

export async function runPipelineVercelStep(
  input: PipelineVercelInput
): Promise<BuildFlowStepResult> {
  return runVercelBuildStep({
    ventureId: input.ventureId,
    ventureName: input.ventureName,
    requestedBy: input.requestedBy,
    environment: toEnvironment(input.mode),
    approvalSessionId: input.approvalSessionId,
  });
}
