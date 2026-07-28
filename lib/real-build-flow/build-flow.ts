/** ForgeOS Real Build Flow — main orchestrator (RC5.2). */

import { buildBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import { buildReleasePackage } from "@/lib/build-platform/release-manager/release-builder";
import { assessSkillRisk } from "@/lib/skills-governance/risk-engine";
import { createLabMockVenture, LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import {
  requestExecutionApproval,
  getApprovalSession,
  approveExecution,
} from "@/lib/real-execution";
import type { VentureProject } from "@/lib/domain/venture";
import { generateBuildFlowExecutionPlan } from "./execution-plan";
import { runGitHubBuildStep } from "./github-step";
import { runSupabaseBuildStep } from "./supabase-step";
import { runVercelBuildStep } from "./vercel-step";
import { buildBuildFlowRollbackPlan, validateBuildFlowRollback } from "./rollback-plan";
import { auditDryRun, auditExecuted } from "./audit";
import {
  validateBuildFlowInput,
  getDefaultEnvironment,
  isRealBuildFlowEnabled,
  isBuildFlowApprovalRequired,
} from "./validator";
import type {
  BuildFlowDryRunResult,
  BuildFlowExecuteResult,
  BuildFlowInput,
  BuildFlowPolicySummary,
  BuildFlowStepResult,
} from "./types";

function resolveVenture(input: BuildFlowInput): VentureProject {
  if (input.venture) return input.venture;
  if (input.ventureId === LAB_MOCK_VENTURE_ID) return createLabMockVenture();
  return {
    ...createLabMockVenture(),
    id: input.ventureId,
    name: `Venture ${input.ventureId.slice(0, 8)}`,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function getBuildFlowPolicySummary(): BuildFlowPolicySummary {
  return {
    enableRealBuildFlow: isRealBuildFlowEnabled(),
    requireApproval: isBuildFlowApprovalRequired(),
    defaultEnvironment: getDefaultEnvironment(),
    allowedProviders: ["github", "supabase", "vercel"],
    blockedOperations: [
      "production deploy",
      "apply DNS",
      "delete repo",
      "push to main",
      "cloudflare DNS apply",
    ],
  };
}

export async function runBuildFlowDryRun(input: BuildFlowInput): Promise<BuildFlowDryRunResult> {
  const validation = validateBuildFlowInput(input);
  if (!validation.valid) {
    throw new Error(validation.errors.join("; "));
  }

  const environment = input.environment ?? getDefaultEnvironment();
  const venture = resolveVenture(input);
  const flowId = `bf-${venture.id}-${Date.now().toString(36)}`;
  const steps: BuildFlowStepResult[] = [];

  const push = (step: BuildFlowStepResult) => {
    steps.push(step);
  };

  push({
    stepId: "select_venture",
    label: "Select Venture",
    status: "completed",
    mode: environment,
    output: `Selected venture: ${venture.name} (${venture.id})`,
    executed: false,
    latencyMs: 0,
  });

  const buildContext = buildBuildContextFromVenture(venture, { persist: false, recordHistory: false });
  push({
    stepId: "read_build_context",
    label: "Read Build Context",
    status: "completed",
    mode: environment,
    output: `Build context loaded — completeness ${buildContext.meta.completenessScore}%`,
    executed: false,
    latencyMs: 0,
  });

  const buildDna = createBuildDnaFromContext(buildContext);
  push({
    stepId: "read_build_dna",
    label: "Read Build DNA",
    status: "completed",
    mode: environment,
    output: `DNA stack: ${buildDna.stack.framework} + ${buildDna.stack.database}`,
    executed: false,
    latencyMs: 0,
  });

  const releasePackage = buildReleasePackage({ venture });
  push({
    stepId: "read_release_package",
    label: "Read Release Package",
    status: "completed",
    mode: environment,
    output: `Release ${releasePackage.releaseId} — ${releasePackage.artifacts.refs.length} artifacts`,
    executed: false,
    latencyMs: 0,
  });

  const executionPlan = generateBuildFlowExecutionPlan({
    ventureId: venture.id,
    ventureName: venture.name,
    buildContext,
    buildDna,
    releasePackage,
    environment,
  });
  push({
    stepId: "generate_execution_plan",
    label: "Generate Execution Plan",
    status: "completed",
    mode: environment,
    output: `Plan ${executionPlan.planId} — ${executionPlan.steps.length} steps`,
    executed: false,
    latencyMs: 0,
  });

  const repoName = slugify(venture.name);
  const githubRepo = await runGitHubBuildStep({
    ventureId: venture.id,
    ventureName: venture.name,
    requestedBy: input.requestedBy,
    repoName,
    environment,
    step: "github_repo",
  });
  const githubBranch = await runGitHubBuildStep({
    ventureId: venture.id,
    ventureName: venture.name,
    requestedBy: input.requestedBy,
    repoName,
    environment,
    step: "github_branch",
  });
  const scaffold = await runGitHubBuildStep({
    ventureId: venture.id,
    ventureName: venture.name,
    requestedBy: input.requestedBy,
    repoName,
    environment,
    step: "project_scaffold",
  });
  const supabase = await runSupabaseBuildStep({
    ventureId: venture.id,
    ventureName: venture.name,
    requestedBy: input.requestedBy,
    environment,
  });
  const vercel = await runVercelBuildStep({
    ventureId: venture.id,
    ventureName: venture.name,
    requestedBy: input.requestedBy,
    environment,
  });

  push({
    stepId: "dry_run",
    label: "Full Dry-Run",
    status: "completed",
    mode: "dry_run",
    output: "Provider dry-runs completed (GitHub, Supabase, Vercel)",
    executed: false,
    latencyMs: githubRepo.latencyMs + supabase.latencyMs + vercel.latencyMs,
  });
  push(githubRepo);
  push(githubBranch);
  push(scaffold);
  push(supabase);
  push(vercel);

  const risk = assessSkillRisk("github", "deploy_preview");
  const riskFactors = [...risk.factors, "Multi-provider build flow", "Preview-only environment"];
  push({
    stepId: "risk_check",
    label: "Risk Check",
    status: risk.level === "CRITICAL" ? "blocked" : "completed",
    mode: environment,
    output: `Risk level: ${risk.level} (score ${risk.score})`,
    executed: false,
    latencyMs: 0,
  });

  push({
    stepId: "human_approval",
    label: "Human Approval",
    status: isBuildFlowApprovalRequired() ? "pending" : "skipped",
    mode: environment,
    output: isBuildFlowApprovalRequired()
      ? "Approval required before real steps (REAL_BUILD_REQUIRE_APPROVAL=true)"
      : "Approval not required by policy",
    executed: false,
    latencyMs: 0,
  });

  auditDryRun({
    flowId,
    ventureId: venture.id,
    requestedBy: input.requestedBy,
    environment,
    riskLevel: risk.level,
    stepsCompleted: steps.length,
    details: `Dry-run completed for ${venture.name}`,
  });

  return {
    flowId,
    venture,
    buildContext,
    buildDna,
    releasePackage,
    executionPlan,
    riskLevel: risk.level,
    riskFactors,
    steps,
    approvalRequired: isBuildFlowApprovalRequired(),
    realExecutionEnabled: isRealBuildFlowEnabled(),
    blockedReason:
      risk.level === "CRITICAL" ? "Risk level CRITICAL blocks build flow" : undefined,
  };
}

export async function requestBuildFlowApproval(input: BuildFlowInput) {
  const dry = await runBuildFlowDryRun(input);
  const approval = await requestExecutionApproval({
    capabilityId: "deploy_software",
    ventureId: dry.venture.id,
    requestedBy: input.requestedBy,
    payload: {
      flowId: dry.flowId,
      ventureName: dry.venture.name,
      environment: dry.executionPlan.environment,
      buildFlow: true,
    },
  });
  return { dryRun: dry, approval };
}

export async function executeBuildFlow(input: BuildFlowInput): Promise<BuildFlowExecuteResult> {
  const dry = await runBuildFlowDryRun(input);

  if (!isRealBuildFlowEnabled()) {
    const rollbackPlan = buildBuildFlowRollbackPlan(dry.executionPlan);
    const audit = auditExecuted({
      flowId: dry.flowId,
      ventureId: dry.venture.id,
      requestedBy: input.requestedBy,
      environment: dry.executionPlan.environment,
      riskLevel: dry.riskLevel,
      stepsCompleted: dry.steps.length,
      details: "ENABLE_REAL_BUILD_FLOW=false — dry-run only",
      success: true,
    });
    return {
      ...dry,
      auditId: audit.id,
      rollbackPlan,
      success: true,
      previewUrl: `https://${slugify(dry.venture.name)}-preview.vercel.app`,
      repoUrl: `https://github.com/forgeos/${slugify(dry.venture.name)}`,
    };
  }

  if (isBuildFlowApprovalRequired()) {
    if (!input.approvalSessionId) {
      throw new Error("approvalSessionId required for real build flow execution");
    }
    const session = getApprovalSession(input.approvalSessionId);
    if (!session || session.status !== "approved") {
      throw new Error("Build flow approval session not approved");
    }
  }

  const rollbackPlan = buildBuildFlowRollbackPlan(dry.executionPlan);
  const rollbackValid = validateBuildFlowRollback(rollbackPlan, dry.executionPlan);
  if (!rollbackValid.valid) {
    throw new Error(rollbackValid.reason ?? "Invalid rollback plan");
  }

  const repoName = slugify(dry.venture.name);
  const executedSteps: BuildFlowStepResult[] = [];

  executedSteps.push(
    await runGitHubBuildStep({
      ventureId: dry.venture.id,
      ventureName: dry.venture.name,
      requestedBy: input.requestedBy,
      repoName,
      environment: dry.executionPlan.environment,
      approvalSessionId: input.approvalSessionId,
      step: "github_repo",
    })
  );
  executedSteps.push(
    await runGitHubBuildStep({
      ventureId: dry.venture.id,
      ventureName: dry.venture.name,
      requestedBy: input.requestedBy,
      repoName,
      environment: dry.executionPlan.environment,
      approvalSessionId: input.approvalSessionId,
      step: "github_branch",
    })
  );
  executedSteps.push(
    await runGitHubBuildStep({
      ventureId: dry.venture.id,
      ventureName: dry.venture.name,
      requestedBy: input.requestedBy,
      repoName,
      environment: dry.executionPlan.environment,
      approvalSessionId: input.approvalSessionId,
      step: "project_scaffold",
    })
  );
  executedSteps.push(
    await runSupabaseBuildStep({
      ventureId: dry.venture.id,
      ventureName: dry.venture.name,
      requestedBy: input.requestedBy,
      environment: dry.executionPlan.environment,
      approvalSessionId: input.approvalSessionId,
    })
  );
  executedSteps.push(
    await runVercelBuildStep({
      ventureId: dry.venture.id,
      ventureName: dry.venture.name,
      requestedBy: input.requestedBy,
      environment: dry.executionPlan.environment,
      approvalSessionId: input.approvalSessionId,
    })
  );

  const allSteps = [...dry.steps, ...executedSteps];
  const success = executedSteps.every((s) => s.status === "completed");

  const audit = auditExecuted({
    flowId: dry.flowId,
    ventureId: dry.venture.id,
    requestedBy: input.requestedBy,
    environment: dry.executionPlan.environment,
    riskLevel: dry.riskLevel,
    stepsCompleted: allSteps.length,
    details: success ? "Build flow executed in preview/sandbox mode" : "One or more steps failed",
    success,
  });

  pushFinalSteps(allSteps, rollbackPlan, audit.id, success);

  return {
    ...dry,
    steps: allSteps,
    approvalSession: input.approvalSessionId
      ? getApprovalSession(input.approvalSessionId) ?? undefined
      : undefined,
    auditId: audit.id,
    rollbackPlan,
    success,
    previewUrl: `https://${repoName}-preview.vercel.app`,
    repoUrl: `https://github.com/forgeos/${repoName}`,
  };
}

function pushFinalSteps(
  steps: BuildFlowStepResult[],
  rollbackPlan: ReturnType<typeof buildBuildFlowRollbackPlan>,
  auditId: string,
  success: boolean
) {
  steps.push({
    stepId: "audit_log",
    label: "Register Audit Log",
    status: "completed",
    mode: "preview",
    output: `Audit recorded: ${auditId}`,
    executed: true,
    latencyMs: 0,
  });
  steps.push({
    stepId: "rollback_plan",
    label: "Register Rollback Plan",
    status: "completed",
    mode: "preview",
    output: rollbackPlan.summary,
    executed: false,
    latencyMs: 0,
  });
  steps.push({
    stepId: "final_result",
    label: "Final Result",
    status: success ? "completed" : "failed",
    mode: "preview",
    output: success
      ? "RC5.2 build flow completed in preview/sandbox mode"
      : "Build flow completed with failures — see step details",
    executed: success,
    latencyMs: 0,
  });
}

export { approveExecution };
