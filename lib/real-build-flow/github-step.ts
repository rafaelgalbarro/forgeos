/** ForgeOS Real Build Flow — GitHub step (RC5.2). */

import { generateDryRunPlan } from "@/lib/connections";
import { executeRealAction } from "@/lib/real-execution";
import type { BuildFlowEnvironment, BuildFlowStepResult } from "./types";
import { isRealBuildFlowEnabled, isOperationBlocked } from "./validator";

export interface GitHubStepInput {
  ventureId: string;
  ventureName: string;
  requestedBy: string;
  repoName: string;
  environment: BuildFlowEnvironment;
  approvalSessionId?: string;
  step: "github_repo" | "github_branch" | "project_scaffold";
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export async function runGitHubBuildStep(input: GitHubStepInput): Promise<BuildFlowStepResult> {
  const started = Date.now();
  const repoName = input.repoName || slugify(input.ventureName);

  const operationMap = {
    github_repo: { capabilityId: "create_repository", op: "create_repository", label: "Create Private GitHub Repo" },
    github_branch: { capabilityId: "create_branch", op: "create_branch", label: "Create Initial Branch" },
    project_scaffold: { capabilityId: "create_repository", op: "prepare_scaffold", label: "Generate Base Project Structure" },
  } as const;

  const cfg = operationMap[input.step];
  const payload: Record<string, unknown> = {
    name: repoName,
    private: true,
    ventureId: input.ventureId,
    scaffold: input.step === "project_scaffold",
    branch: "forgeos/init",
    environment: input.environment,
  };

  if (isOperationBlocked(cfg.op, payload)) {
    return {
      stepId: input.step,
      label: cfg.label,
      status: "blocked",
      mode: input.environment,
      output: "Operation blocked by RC5.2 security policy",
      provider: "github",
      executed: false,
      latencyMs: Date.now() - started,
    };
  }

  if (!isRealBuildFlowEnabled()) {
    const dry = await generateDryRunPlan(
      "github",
      cfg.op,
      input.ventureId,
      input.requestedBy,
      payload
    );
    return {
      stepId: input.step,
      label: cfg.label,
      status: "completed",
      mode: "dry_run",
      output: dry.output || `[DRY-RUN] ${cfg.label} for ${repoName}`,
      provider: "github",
      executed: false,
      latencyMs: Date.now() - started,
      connectionResult: dry,
    };
  }

  if (!input.approvalSessionId) {
    return {
      stepId: input.step,
      label: cfg.label,
      status: "blocked",
      mode: input.environment,
      output: "Human approval required before real GitHub step",
      provider: "github",
      executed: false,
      latencyMs: Date.now() - started,
    };
  }

  const result = await executeRealAction({
    capabilityId: cfg.capabilityId,
    ventureId: input.ventureId,
    requestedBy: input.requestedBy,
    approvalSessionId: input.approvalSessionId,
    payload,
    mode: "sandbox",
    userConfirmed: true,
  });

  return {
    stepId: input.step,
      label: cfg.label,
      status: result.success ? "completed" : "failed",
      mode: input.environment,
      output: result.output ?? result.blockedReason ?? "GitHub step finished",
      provider: "github",
      executed: result.executed ?? false,
      latencyMs: Date.now() - started,
  };
}
