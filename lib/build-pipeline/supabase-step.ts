/** ForgeOS Build Pipeline — Supabase adapter (wraps real-build-flow). */

import { runSupabaseBuildStep } from "@/lib/real-build-flow/supabase-step";
import type { BuildFlowStepResult } from "@/lib/real-build-flow/types";
import type { PipelineMode } from "./types";

export interface PipelineSupabaseInput {
  ventureId: string;
  ventureName: string;
  requestedBy: string;
  mode: PipelineMode;
  approvalSessionId?: string;
}

function toEnvironment(mode: PipelineMode): "preview" | "sandbox" | "dry_run" {
  if (mode === "dry_run") return "dry_run";
  return "sandbox";
}

export async function runPipelineSupabaseStep(
  input: PipelineSupabaseInput
): Promise<BuildFlowStepResult> {
  return runSupabaseBuildStep({
    ventureId: input.ventureId,
    ventureName: input.ventureName,
    requestedBy: input.requestedBy,
    environment: toEnvironment(input.mode),
    approvalSessionId: input.approvalSessionId,
  });
}
