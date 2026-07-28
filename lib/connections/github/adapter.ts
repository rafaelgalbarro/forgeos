/** ForgeOS Real Connections — GitHub adapter (RC5). */

import { BaseConnectionAdapter } from "../shared/base-adapter";
import type { ConnectionContext } from "../shared/connection-context";
import type { ConnectionPlan, ConnectionResult } from "../shared/types";
import { validateGitHubConnection, listGitHubRepos, isGitHubConfigured } from "./client";
import { redactSecrets } from "../security/secret-redaction";

class GitHubConnectionAdapter extends BaseConnectionAdapter {
  readonly provider = "github" as const;
  readonly defaultRisk = "medium" as const;

  async validateConnection(ctx: ConnectionContext): Promise<ConnectionResult> {
    const started = Date.now();
    if (!isGitHubConfigured()) {
      return {
        success: false,
        provider: "github",
        operation: "validate",
        mode: ctx.mode,
        output: "GITHUB_TOKEN not configured — dry-run only",
        errors: ["Credential not configured"],
        warnings: ["Configure GITHUB_TOKEN in server environment for live validation"],
        auditId: crypto.randomUUID(),
        executed: false,
        telemetry: { latencyMs: Date.now() - started, provider: "github", operation: "validate", mode: ctx.mode, success: false, costEstimate: 0 },
      };
    }

    try {
      const { user, repoCount } = await validateGitHubConnection();
      return {
        success: true,
        provider: "github",
        operation: "validate",
        mode: ctx.mode,
        output: `Connected as ${user.login} (${repoCount}+ repos accessible)`,
        data: { login: user.login, type: user.type },
        errors: [],
        warnings: [],
        auditId: crypto.randomUUID(),
        executed: false,
        telemetry: { latencyMs: Date.now() - started, provider: "github", operation: "validate", mode: ctx.mode, success: true, costEstimate: 0 },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Validation failed";
      return {
        success: false,
        provider: "github",
        operation: "validate",
        mode: ctx.mode,
        output: redactSecrets(msg),
        errors: [redactSecrets(msg)],
        warnings: [],
        auditId: crypto.randomUUID(),
        executed: false,
        telemetry: { latencyMs: Date.now() - started, provider: "github", operation: "validate", mode: ctx.mode, success: false, costEstimate: 0 },
      };
    }
  }

  async buildPlan(ctx: ConnectionContext): Promise<ConnectionPlan> {
    const op = ctx.operation;
    const payload = ctx.payload;
    const steps = [];

    if (op === "create_repository" || op === "create_repo") {
      steps.push(
        { stepId: "gh-1", action: "create_repo", description: `Create repo: ${payload.name ?? "new-repo"}`, reversible: true, estimatedDurationMs: 3000 },
        { stepId: "gh-2", action: "branch_protection", description: "Configure default branch protection", reversible: true, estimatedDurationMs: 2000 }
      );
    } else if (op === "create_branch") {
      steps.push({ stepId: "gh-1", action: "create_branch", description: `Branch ${payload.branch ?? "feature"} from ${payload.from ?? "main"}`, reversible: true, estimatedDurationMs: 1500 });
    } else if (op === "open_pull_request") {
      steps.push({ stepId: "gh-1", action: "open_pr", description: `PR: ${payload.head ?? "feature"} → ${payload.base ?? "main"}`, reversible: true, estimatedDurationMs: 2000 });
    } else if (op === "prepare_release") {
      steps.push(
        { stepId: "gh-1", action: "tag_release", description: `Tag ${payload.version ?? "v1.0.0"}`, reversible: true, estimatedDurationMs: 2000 },
        { stepId: "gh-2", action: "generate_notes", description: "Generate changelog from commits", reversible: false, estimatedDurationMs: 3000 }
      );
    } else if (op === "list_repos") {
      steps.push({ stepId: "gh-1", action: "list_repos", description: "List accessible repositories", reversible: false, estimatedDurationMs: 1000 });
    } else {
      steps.push({ stepId: "gh-1", action: op, description: `GitHub operation: ${op}`, reversible: false, estimatedDurationMs: 2000 });
    }

    return {
      planId: crypto.randomUUID(),
      provider: "github",
      operation: op,
      mode: ctx.mode,
      steps,
      rollbackSteps: steps.filter((s) => s.reversible).map((s) => ({
        ...s,
        stepId: `rollback-${s.stepId}`,
        description: `Rollback: ${s.description}`,
      })),
      estimatedCost: 0,
      riskLevel: op.includes("create") || op.includes("release") ? "medium" : "low",
      requiresApproval: op === "prepare_release",
      summary: `GitHub plan for ${op} (${steps.length} steps)`,
    };
  }

  async dryRun(ctx: ConnectionContext, plan: ConnectionPlan): Promise<ConnectionResult> {
    const started = Date.now();
    let listData: unknown;

    if (ctx.operation === "list_repos" && isGitHubConfigured()) {
      try {
        listData = await listGitHubRepos(5);
      } catch {
        listData = undefined;
      }
    }

    return {
      success: true,
      provider: "github",
      operation: ctx.operation,
      mode: "dry_run",
      output: `[DRY-RUN] ${plan.summary} — no mutations performed`,
      plan,
      data: listData ? { repos: (listData as { name: string }[]).map((r) => ({ name: r.name })) } : { simulated: true, steps: plan.steps.map((s) => s.action) },
      errors: [],
      warnings: ["Dry-run mode — no repository changes"],
      auditId: crypto.randomUUID(),
      executed: false,
      telemetry: { latencyMs: Date.now() - started, provider: "github", operation: ctx.operation, mode: "dry_run", success: true, costEstimate: 0 },
    };
  }

  async executeReal(ctx: ConnectionContext, plan: ConnectionPlan): Promise<ConnectionResult> {
    const started = Date.now();
    return {
      success: false,
      provider: "github",
      operation: ctx.operation,
      mode: "production",
      output: "Production GitHub mutations disabled in RC5 — use governance-approved deployment pipeline",
      plan,
      errors: ["Real GitHub mutations blocked by RC5 safety policy"],
      warnings: [],
      auditId: crypto.randomUUID(),
      executed: false,
      blockedReason: "RC5 blocks direct production mutations",
      telemetry: { latencyMs: Date.now() - started, provider: "github", operation: ctx.operation, mode: "production", success: false, costEstimate: 0 },
    };
  }

  buildRollbackPlan(_ctx: ConnectionContext, plan: ConnectionPlan): ConnectionPlan {
    return {
      ...plan,
      planId: crypto.randomUUID(),
      mode: "dry_run",
      steps: plan.rollbackSteps,
      rollbackSteps: [],
      summary: `Rollback plan for ${plan.operation}`,
    };
  }
}

export const githubAdapter = new GitHubConnectionAdapter();
