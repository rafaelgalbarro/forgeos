/** ForgeOS Real Build Flow — Supabase step (RC5.2). */

import { generateDryRunPlan } from "@/lib/connections";
import { executeRealAction } from "@/lib/real-execution";
import type { BuildFlowEnvironment, BuildFlowStepResult } from "./types";
import { isRealBuildFlowEnabled, isOperationBlocked } from "./validator";

export interface SupabaseStepInput {
  ventureId: string;
  ventureName: string;
  requestedBy: string;
  environment: BuildFlowEnvironment;
  approvalSessionId?: string;
}

export async function runSupabaseBuildStep(input: SupabaseStepInput): Promise<BuildFlowStepResult> {
  const started = Date.now();
  const payload: Record<string, unknown> = {
    projectName: `${input.ventureName}-sandbox`.toLowerCase().replace(/\s+/g, "-"),
    ventureId: input.ventureId,
    sandbox: true,
    migrations: ["001_init.sql", "002_seed.sql"],
    environment: "sandbox",
  };

  if (isOperationBlocked("create_database", payload)) {
    return {
      stepId: "supabase_sandbox",
      label: "Prepare Supabase Sandbox",
      status: "blocked",
      mode: input.environment,
      output: "Supabase operation blocked — production mutations not allowed",
      provider: "supabase",
      executed: false,
      latencyMs: Date.now() - started,
    };
  }

  if (!isRealBuildFlowEnabled()) {
    const dry = await generateDryRunPlan(
      "supabase",
      "create_database",
      input.ventureId,
      input.requestedBy,
      payload
    );
    return {
      stepId: "supabase_sandbox",
      label: "Prepare Supabase Sandbox",
      status: "completed",
      mode: "dry_run",
      output: dry.output || "[DRY-RUN] Supabase sandbox migration plan prepared",
      provider: "supabase",
      executed: false,
      latencyMs: Date.now() - started,
      connectionResult: dry,
    };
  }

  if (!input.approvalSessionId) {
    return {
      stepId: "supabase_sandbox",
      label: "Prepare Supabase Sandbox",
      status: "blocked",
      mode: input.environment,
      output: "Human approval required before Supabase sandbox step",
      provider: "supabase",
      executed: false,
      latencyMs: Date.now() - started,
    };
  }

  const result = await executeRealAction({
    capabilityId: "create_database",
    ventureId: input.ventureId,
    requestedBy: input.requestedBy,
    approvalSessionId: input.approvalSessionId,
    payload,
    mode: "sandbox",
    userConfirmed: true,
  });

  return {
    stepId: "supabase_sandbox",
    label: "Prepare Supabase Sandbox",
    status: result.success ? "completed" : "failed",
    mode: input.environment,
    output: result.output ?? result.blockedReason ?? "Supabase step finished",
    provider: "supabase",
    executed: result.executed ?? false,
    latencyMs: Date.now() - started,
  };
}
