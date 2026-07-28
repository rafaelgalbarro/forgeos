/** ForgeOS Real Connections — Supabase adapter (RC5). */

import { BaseConnectionAdapter } from "../shared/base-adapter";
import type { ConnectionContext } from "../shared/connection-context";
import type { ConnectionPlan, ConnectionResult } from "../shared/types";
import { validateSupabaseConnection, listSupabaseProjects, isSupabaseConfigured } from "./client";
import { redactSecrets } from "../security/secret-redaction";

class SupabaseConnectionAdapter extends BaseConnectionAdapter {
  readonly provider = "supabase" as const;
  readonly defaultRisk = "high" as const;

  async validateConnection(ctx: ConnectionContext): Promise<ConnectionResult> {
    const started = Date.now();
    if (!isSupabaseConfigured()) {
      return this.validationResult(ctx, started, false, "SUPABASE_ACCESS_TOKEN not configured");
    }
    try {
      const { projectCount } = await validateSupabaseConnection();
      return this.validationResult(ctx, started, true, `Connected — ${projectCount} project(s) accessible`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Validation failed";
      return this.validationResult(ctx, started, false, redactSecrets(msg));
    }
  }

  private validationResult(ctx: ConnectionContext, started: number, success: boolean, output: string): ConnectionResult {
    return {
      success,
      provider: "supabase",
      operation: "validate",
      mode: ctx.mode,
      output,
      errors: success ? [] : [output],
      warnings: success ? [] : ["Configure SUPABASE_ACCESS_TOKEN for live validation"],
      auditId: crypto.randomUUID(),
      executed: false,
      telemetry: { latencyMs: Date.now() - started, provider: "supabase", operation: "validate", mode: ctx.mode, success, costEstimate: 0 },
    };
  }

  async buildPlan(ctx: ConnectionContext): Promise<ConnectionPlan> {
    const tables = (ctx.payload.tables as string[]) ?? ["ventures", "users", "audit_log"];
    const steps = [
      { stepId: "sb-1", action: "schema_plan", description: `Plan schema: ${tables.join(", ")}`, reversible: false, estimatedDurationMs: 2000 },
      { stepId: "sb-2", action: "migration_plan", description: "Generate migration SQL (dry-run)", reversible: false, estimatedDurationMs: 3000 },
      { stepId: "sb-3", action: "rls_policies", description: "Plan RLS policies", reversible: true, estimatedDurationMs: 2000 },
    ];

    return {
      planId: crypto.randomUUID(),
      provider: "supabase",
      operation: ctx.operation,
      mode: ctx.mode,
      steps,
      rollbackSteps: [{ stepId: "sb-r1", action: "rollback_migration", description: "Rollback last migration", reversible: false, estimatedDurationMs: 2000 }],
      estimatedCost: 0,
      riskLevel: "high",
      requiresApproval: true,
      summary: `Supabase DB plan for ${ctx.operation}`,
    };
  }

  async dryRun(ctx: ConnectionContext, plan: ConnectionPlan): Promise<ConnectionResult> {
    const started = Date.now();
    let projects: unknown;
    if (isSupabaseConfigured()) {
      try { projects = await listSupabaseProjects(); } catch { /* ignore */ }
    }
    return {
      success: true,
      provider: "supabase",
      operation: ctx.operation,
      mode: "dry_run",
      output: `[DRY-RUN] ${plan.summary} — no tables created`,
      plan,
      data: { simulated: true, projects: projects ? (projects as { name: string }[]).slice(0, 5).map((p) => p.name) : [] },
      errors: [],
      warnings: ["Dry-run — no database mutations"],
      auditId: crypto.randomUUID(),
      executed: false,
      telemetry: { latencyMs: Date.now() - started, provider: "supabase", operation: ctx.operation, mode: "dry_run", success: true, costEstimate: 0 },
    };
  }

  async executeReal(ctx: ConnectionContext, plan: ConnectionPlan): Promise<ConnectionResult> {
    return {
      success: false,
      provider: "supabase",
      operation: ctx.operation,
      mode: "production",
      output: "Production DB mutations disabled in RC5",
      plan,
      errors: ["Real Supabase mutations blocked by RC5 safety policy"],
      warnings: [],
      auditId: crypto.randomUUID(),
      executed: false,
      blockedReason: "RC5 blocks direct production DB mutations",
      telemetry: { latencyMs: 0, provider: "supabase", operation: ctx.operation, mode: "production", success: false, costEstimate: 0 },
    };
  }

  buildRollbackPlan(_ctx: ConnectionContext, plan: ConnectionPlan): ConnectionPlan {
    return { ...plan, planId: crypto.randomUUID(), mode: "dry_run", steps: plan.rollbackSteps, rollbackSteps: [], summary: `Rollback: ${plan.operation}` };
  }
}

export const supabaseAdapter = new SupabaseConnectionAdapter();
