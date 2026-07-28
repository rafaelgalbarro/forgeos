/** ForgeOS Real Connections — Cloudflare adapter (RC5). */

import { BaseConnectionAdapter } from "../shared/base-adapter";
import type { ConnectionContext } from "../shared/connection-context";
import type { ConnectionPlan, ConnectionResult } from "../shared/types";
import { validateCloudflareConnection, listCloudflareZones, isCloudflareConfigured } from "./client";
import { redactSecrets } from "../security/secret-redaction";

class CloudflareConnectionAdapter extends BaseConnectionAdapter {
  readonly provider = "cloudflare" as const;
  readonly defaultRisk = "high" as const;

  async validateConnection(ctx: ConnectionContext): Promise<ConnectionResult> {
    const started = Date.now();
    if (!isCloudflareConfigured()) {
      return this.result(ctx, started, false, "CLOUDFLARE_API_TOKEN not configured");
    }
    try {
      const { zoneCount } = await validateCloudflareConnection();
      return this.result(ctx, started, true, `Connected — ${zoneCount}+ zone(s) accessible`);
    } catch (err) {
      return this.result(ctx, started, false, redactSecrets(err instanceof Error ? err.message : "Failed"));
    }
  }

  private result(ctx: ConnectionContext, started: number, success: boolean, output: string): ConnectionResult {
    return {
      success, provider: "cloudflare", operation: "validate", mode: ctx.mode, output,
      errors: success ? [] : [output], warnings: [], auditId: crypto.randomUUID(), executed: false,
      telemetry: { latencyMs: Date.now() - started, provider: "cloudflare", operation: "validate", mode: ctx.mode, success, costEstimate: 0 },
    };
  }

  async buildPlan(ctx: ConnectionContext): Promise<ConnectionPlan> {
    const domain = (ctx.payload.domain as string) ?? "app.example.com";
    const steps = [
      { stepId: "cf-1", action: "domain_plan", description: `Plan domain: ${domain}`, reversible: false, estimatedDurationMs: 1000 },
      { stepId: "cf-2", action: "dns_plan", description: `DNS CNAME ${domain} → deployment`, reversible: true, estimatedDurationMs: 2000 },
      { stepId: "cf-3", action: "ssl_plan", description: "Plan SSL/TLS configuration", reversible: false, estimatedDurationMs: 1500 },
    ];

    return {
      planId: crypto.randomUUID(), provider: "cloudflare", operation: ctx.operation, mode: ctx.mode, steps,
      rollbackSteps: [{ stepId: "cf-r1", action: "revert_dns", description: "Revert DNS records to previous state", reversible: false, estimatedDurationMs: 2000 }],
      estimatedCost: 0, riskLevel: "high", requiresApproval: true,
      summary: `Cloudflare plan for ${ctx.operation} — ${domain}`,
    };
  }

  async dryRun(ctx: ConnectionContext, plan: ConnectionPlan): Promise<ConnectionResult> {
    const started = Date.now();
    let zones: string[] = [];
    if (isCloudflareConfigured()) {
      try { zones = (await listCloudflareZones()).map((z) => z.name); } catch { /* ignore */ }
    }
    return {
      success: true, provider: "cloudflare", operation: ctx.operation, mode: "dry_run",
      output: `[DRY-RUN] ${plan.summary} — no DNS changes`,
      plan, data: { simulated: true, zones: zones.slice(0, 5) },
      errors: [], warnings: ["Dry-run — no DNS mutations"], auditId: crypto.randomUUID(), executed: false,
      telemetry: { latencyMs: Date.now() - started, provider: "cloudflare", operation: ctx.operation, mode: "dry_run", success: true, costEstimate: 0 },
    };
  }

  async executeReal(ctx: ConnectionContext, plan: ConnectionPlan): Promise<ConnectionResult> {
    return {
      success: false, provider: "cloudflare", operation: ctx.operation, mode: "production",
      output: "Production DNS changes disabled in RC5", plan,
      errors: ["Real Cloudflare DNS changes blocked by RC5 safety policy"], warnings: [],
      auditId: crypto.randomUUID(), executed: false, blockedReason: "RC5 blocks direct DNS mutations",
      telemetry: { latencyMs: 0, provider: "cloudflare", operation: ctx.operation, mode: "production", success: false, costEstimate: 0 },
    };
  }

  buildRollbackPlan(_ctx: ConnectionContext, plan: ConnectionPlan): ConnectionPlan {
    return { ...plan, planId: crypto.randomUUID(), mode: "dry_run", steps: plan.rollbackSteps, rollbackSteps: [], summary: `Rollback: ${plan.operation}` };
  }
}

export const cloudflareAdapter = new CloudflareConnectionAdapter();
