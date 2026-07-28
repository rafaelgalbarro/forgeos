/** ForgeOS RC5.3 — controlled real execution orchestrator. */

import { getApprovalSession, isSessionApproved } from "@/lib/real-execution/approval-session";
import { auditExecutionAttempt } from "@/lib/real-execution/execution-audit";
import { runProviderExecutionGuard } from "@/lib/real-execution/providers/provider-execution-guard";
import { executeGitHubControlledReal } from "@/lib/real-execution/providers/github-real-executor";
import { executeVercelControlledReal } from "@/lib/real-execution/providers/vercel-real-executor";
import { executeSupabaseControlledReal } from "@/lib/real-execution/providers/supabase-real-executor";
import { executeCloudflareControlledReal } from "@/lib/real-execution/providers/cloudflare-real-executor";
import type { NormalizedProviderResult } from "@/lib/real-execution/providers/provider-result-normalizer";
import type { ExecutionGate } from "@/lib/real-execution/types";
import { runBuildFlowDryRun } from "./build-flow";
import { buildBuildFlowRollbackPlan } from "./rollback-plan";
import { getExecutionFlagsSnapshot } from "./execution-flags";
import { listBlockedCategories } from "./execution-safety";
import type { BuildFlowInput } from "./types";

export interface ControlledExecutionResult {
  flowId: string;
  mode: ReturnType<typeof getExecutionFlagsSnapshot>["modeLabel"];
  flags: ReturnType<typeof getExecutionFlagsSnapshot>;
  simulate: boolean;
  guards: ExecutionGate[];
  allGuardsPassed: boolean;
  blockedReason?: string;
  providerResults: NormalizedProviderResult[];
  warnings: string[];
  rollbackSteps: string[];
  auditIds: string[];
  repoUrl?: string;
  branch?: string;
  prUrl?: string;
  previewUrl?: string;
  success: boolean;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function simulateControlledRealExecution(
  input: BuildFlowInput
): Promise<ControlledExecutionResult> {
  return runControlledRealExecution(input, true);
}

export async function runControlledRealExecution(
  input: BuildFlowInput,
  simulate = false
): Promise<ControlledExecutionResult> {
  const flags = getExecutionFlagsSnapshot();
  const dry = await runBuildFlowDryRun(input);
  const rollbackPlan = buildBuildFlowRollbackPlan(dry.executionPlan);
  const approved =
    simulate ||
    (input.approvalSessionId
      ? isSessionApproved(getApprovalSession(input.approvalSessionId))
      : false);

  const guard = await runProviderExecutionGuard({
    provider: "github",
    operation: "create_repository",
    ventureId: dry.venture.id,
    requestedBy: input.requestedBy,
    approvalSessionId: input.approvalSessionId,
    payload: { environment: "preview", ventureName: dry.venture.name },
    hasRollbackPlan: Boolean(rollbackPlan.rollbackSteps?.length),
  });

  const warnings = [...listBlockedCategories().map((c) => `Blocked: ${c}`)];
  const providerResults: NormalizedProviderResult[] = [];
  const auditIds: string[] = [];
  const slug = slugify(dry.venture.name);

  if (simulate || !guard.allPassed) {
    const gh = await executeGitHubControlledReal({
      ventureId: dry.venture.id,
      ventureName: dry.venture.name,
      ventureSlug: slug,
      approved: false,
    });
    providerResults.push(...gh.results);

    const vercel = await executeVercelControlledReal({
      ventureName: dry.venture.name,
      approved: false,
    });
    providerResults.push(...vercel.results);

    const supabase = await executeSupabaseControlledReal({
      ventureName: dry.venture.name,
      approved: false,
    });
    providerResults.push(...supabase.results);

    const cf = await executeCloudflareControlledReal({
      ventureName: dry.venture.name,
      approved: false,
    });
    providerResults.push(...cf.results);

    const audit = auditExecutionAttempt({
      requestId: dry.flowId,
      capabilityId: "deploy_software",
      provider: "github",
      operation: "controlled_build_flow",
      ventureId: dry.venture.id,
      requestedBy: input.requestedBy,
      mode: "dry_run",
      outcome: "dry_run",
      gates: guard.gates,
      details: simulate ? "Simulated controlled real execution" : guard.blockedReason ?? "Guards failed",
      riskLevel: dry.riskLevel,
    });
    auditIds.push(audit.id);

    return {
      flowId: dry.flowId,
      mode: flags.modeLabel,
      flags,
      simulate: true,
      guards: guard.gates,
      allGuardsPassed: guard.allPassed,
      blockedReason: simulate ? undefined : guard.blockedReason,
      providerResults,
      warnings,
      rollbackSteps: rollbackPlan.rollbackSteps.map((s) => s.description),
      auditIds,
      success: true,
    };
  }

  const gh = await executeGitHubControlledReal({
    ventureId: dry.venture.id,
    ventureName: dry.venture.name,
    ventureSlug: slug,
    approved: true,
  });
  providerResults.push(...gh.results);

  const vercel = await executeVercelControlledReal({
    ventureName: dry.venture.name,
    approved: true,
  });
  providerResults.push(...vercel.results);

  const supabase = await executeSupabaseControlledReal({
    ventureName: dry.venture.name,
    approved: true,
  });
  providerResults.push(...supabase.results);

  const cf = await executeCloudflareControlledReal({
    ventureName: dry.venture.name,
    approved: true,
  });
  providerResults.push(...cf.results);

  const success = providerResults.every((r) => r.success);
  const audit = auditExecutionAttempt({
    requestId: dry.flowId,
    capabilityId: "deploy_software",
    provider: "github",
    operation: "controlled_build_flow",
    ventureId: dry.venture.id,
    requestedBy: input.requestedBy,
    mode: "sandbox",
    outcome: success ? "executed" : "failed",
    gates: guard.gates,
    details: `RC5.3 controlled execution — ${providerResults.length} provider steps`,
    riskLevel: dry.riskLevel,
  });
  auditIds.push(audit.id);

  return {
    flowId: dry.flowId,
    mode: flags.modeLabel,
    flags,
    simulate: false,
    guards: guard.gates,
    allGuardsPassed: true,
    providerResults,
    warnings,
    rollbackSteps: [
      ...rollbackPlan.rollbackSteps.map((s) => s.description),
      ...gh.rollbackSteps,
    ],
    auditIds,
    repoUrl: gh.repoUrl,
    branch: gh.branch,
    prUrl: gh.prUrl,
    previewUrl: `https://${slug}-preview.vercel.app`,
    success,
  };
}
