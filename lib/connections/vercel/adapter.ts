/** ForgeOS Real Connections — Vercel adapter (RC5). */

import { BaseConnectionAdapter } from "../shared/base-adapter";
import type { ConnectionContext } from "../shared/connection-context";
import type { ConnectionPlan, ConnectionResult } from "../shared/types";
import { validateVercelConnection, listVercelProjects, isVercelConfigured } from "./client";
import { redactSecrets } from "../security/secret-redaction";

class VercelConnectionAdapter extends BaseConnectionAdapter {
  readonly provider = "vercel" as const;
  readonly defaultRisk = "high" as const;

  async validateConnection(ctx: ConnectionContext): Promise<ConnectionResult> {
    const started = Date.now();
    if (!isVercelConfigured()) {
      return this.result(ctx, started, false, "VERCEL_TOKEN not configured");
    }
    try {
      const { projectCount } = await validateVercelConnection();
      return this.result(ctx, started, true, `Connected — projects accessible (${projectCount}+)`);
    } catch (err) {
      return this.result(ctx, started, false, redactSecrets(err instanceof Error ? err.message : "Failed"));
    }
  }

  private result(ctx: ConnectionContext, started: number, success: boolean, output: string): ConnectionResult {
    return {
      success, provider: "vercel", operation: "validate", mode: ctx.mode, output,
      errors: success ? [] : [output], warnings: [], auditId: crypto.randomUUID(), executed: false,
      telemetry: { latencyMs: Date.now() - started, provider: "vercel", operation: "validate", mode: ctx.mode, success, costEstimate: 0 },
    };
  }

  async buildPlan(ctx: ConnectionContext): Promise<ConnectionPlan> {
    const target = (ctx.payload.target as string) ?? "preview";
    const steps = ctx.operation === "create_environment"
      ? [
          { stepId: "vc-1", action: "create_env", description: `Create ${target} environment`, reversible: true, estimatedDurationMs: 2000 },
          { stepId: "vc-2", action: "env_vars_plan", description: "Plan environment variables", reversible: true, estimatedDurationMs: 1500 },
        ]
      : [
          { stepId: "vc-1", action: "build_plan", description: "Plan build configuration", reversible: false, estimatedDurationMs: 3000 },
          { stepId: "vc-2", action: "deploy_preview", description: `Deploy to ${target}`, reversible: true, estimatedDurationMs: 60000 },
        ];

    return {
      planId: crypto.randomUUID(), provider: "vercel", operation: ctx.operation, mode: ctx.mode, steps,
      rollbackSteps: [{ stepId: "vc-r1", action: "rollback_deployment", description: "Rollback to previous deployment", reversible: false, estimatedDurationMs: 5000 }],
      estimatedCost: 0, riskLevel: target === "production" ? "critical" : "medium", requiresApproval: true,
      summary: `Vercel plan for ${ctx.operation} (${target})`,
    };
  }

  async dryRun(ctx: ConnectionContext, plan: ConnectionPlan): Promise<ConnectionResult> {
    const started = Date.now();
    let projects: string[] = [];
    if (isVercelConfigured()) {
      try { projects = (await listVercelProjects()).map((p) => p.name); } catch { /* ignore */ }
    }
    return {
      success: true, provider: "vercel", operation: ctx.operation, mode: "dry_run",
      output: `[DRY-RUN] ${plan.summary} — no deployment triggered`,
      plan, data: { simulated: true, projects: projects.slice(0, 5) },
      errors: [], warnings: ["Dry-run — no deployments"], auditId: crypto.randomUUID(), executed: false,
      telemetry: { latencyMs: Date.now() - started, provider: "vercel", operation: ctx.operation, mode: "dry_run", success: true, costEstimate: 0 },
    };
  }

  async executeReal(ctx: ConnectionContext, plan: ConnectionPlan): Promise<ConnectionResult> {
    return {
      success: false, provider: "vercel", operation: ctx.operation, mode: "production",
      output: "Production Vercel deploys disabled in RC5", plan,
      errors: ["Real Vercel deploys blocked by RC5 safety policy"], warnings: [],
      auditId: crypto.randomUUID(), executed: false, blockedReason: "RC5 blocks direct production deploys",
      telemetry: { latencyMs: 0, provider: "vercel", operation: ctx.operation, mode: "production", success: false, costEstimate: 0 },
    };
  }

  buildRollbackPlan(_ctx: ConnectionContext, plan: ConnectionPlan): ConnectionPlan {
    return { ...plan, planId: crypto.randomUUID(), mode: "dry_run", steps: plan.rollbackSteps, rollbackSteps: [], summary: `Rollback: ${plan.operation}` };
  }
}

export const vercelAdapter = new VercelConnectionAdapter();
