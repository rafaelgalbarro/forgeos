/** ForgeOS Real Build Flow — Vercel step (RC5.2). */

import { generateDryRunPlan } from "@/lib/connections";
import { executeRealAction } from "@/lib/real-execution";
import type { BuildFlowEnvironment, BuildFlowStepResult } from "./types";
import { isRealBuildFlowEnabled, isOperationBlocked } from "./validator";

export interface VercelStepInput {
  ventureId: string;
  ventureName: string;
  requestedBy: string;
  environment: BuildFlowEnvironment;
  approvalSessionId?: string;
}

export async function runVercelBuildStep(input: VercelStepInput): Promise<BuildFlowStepResult> {
  const started = Date.now();
  const payload: Record<string, unknown> = {
    projectName: input.ventureName.toLowerCase().replace(/\s+/g, "-"),
    ventureId: input.ventureId,
    target: "preview",
    environment: "preview",
    production: false,
  };

  if (isOperationBlocked("deploy_software", payload)) {
    return {
      stepId: "vercel_preview",
      label: "Prepare Vercel Preview",
      status: "blocked",
      mode: input.environment,
      output: "Vercel production deploy blocked in RC5.2",
      provider: "vercel",
      executed: false,
      latencyMs: Date.now() - started,
    };
  }

  if (!isRealBuildFlowEnabled()) {
    const dry = await generateDryRunPlan(
      "vercel",
      "deploy_software",
      input.ventureId,
      input.requestedBy,
      payload
    );
    return {
      stepId: "vercel_preview",
      label: "Prepare Vercel Preview",
      status: "completed",
      mode: "dry_run",
      output: dry.output || `[DRY-RUN] Vercel preview plan for ${payload.projectName}`,
      provider: "vercel",
      executed: false,
      latencyMs: Date.now() - started,
      connectionResult: dry,
    };
  }

  if (!input.approvalSessionId) {
    return {
      stepId: "vercel_preview",
      label: "Prepare Vercel Preview",
      status: "blocked",
      mode: input.environment,
      output: "Human approval required before Vercel preview step",
      provider: "vercel",
      executed: false,
      latencyMs: Date.now() - started,
    };
  }

  const result = await executeRealAction({
    capabilityId: "deploy_software",
    ventureId: input.ventureId,
    requestedBy: input.requestedBy,
    approvalSessionId: input.approvalSessionId,
    payload,
    mode: "sandbox",
    userConfirmed: true,
  });

  const previewUrl = `https://${String(payload.projectName)}-preview.vercel.app`;

  return {
    stepId: "vercel_preview",
    label: "Prepare Vercel Preview",
    status: result.success ? "completed" : "failed",
    mode: input.environment,
    output: result.output ?? `Preview prepared: ${previewUrl}`,
    provider: "vercel",
    executed: result.executed ?? false,
    latencyMs: Date.now() - started,
  };
}
