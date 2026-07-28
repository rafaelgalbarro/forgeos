/** ForgeOS Real Connections — base adapter pattern (RC5). */

import { enforceConnectionPolicy } from "../security/connection-policy";
import { auditConnectionAttempt } from "../security/connection-audit";
import { redactSecrets } from "../security/secret-redaction";
import { createConnectionContext, canExecuteReal } from "./connection-context";
import type { ConnectionContext } from "./connection-context";
import type {
  ConnectionMode,
  ConnectionPlan,
  ConnectionProvider,
  ConnectionResult,
  ConnectionRiskLevel,
} from "./types";

export abstract class BaseConnectionAdapter {
  abstract readonly provider: ConnectionProvider;
  abstract readonly defaultRisk: ConnectionRiskLevel;

  abstract validateConnection(ctx: ConnectionContext): Promise<ConnectionResult>;
  abstract buildPlan(ctx: ConnectionContext): Promise<ConnectionPlan>;
  abstract dryRun(ctx: ConnectionContext, plan: ConnectionPlan): Promise<ConnectionResult>;
  abstract executeReal(ctx: ConnectionContext, plan: ConnectionPlan): Promise<ConnectionResult>;
  abstract buildRollbackPlan(ctx: ConnectionContext, plan: ConnectionPlan): ConnectionPlan;

  async run(
    operation: string,
    opts: {
      ventureId: string;
      requestedBy: string;
      approvedBy?: string;
      mode?: ConnectionMode;
      userConfirmed?: boolean;
      approvalGranted?: boolean;
      riskAllowed?: boolean;
      permissionValid?: boolean;
      payload?: Record<string, unknown>;
    }
  ): Promise<ConnectionResult> {
    const started = Date.now();
    const ctx = createConnectionContext({
      ventureId: opts.ventureId,
      requestedBy: opts.requestedBy,
      approvedBy: opts.approvedBy,
      provider: this.provider,
      operation,
      mode: opts.mode ?? "dry_run",
      userConfirmed: opts.userConfirmed ?? false,
      approvalGranted: opts.approvalGranted ?? false,
      riskAllowed: opts.riskAllowed ?? true,
      permissionValid: opts.permissionValid ?? true,
      payload: opts.payload ?? {},
    });

    const policy = enforceConnectionPolicy(ctx);
    if (!policy.allowed) {
      return this.blocked(ctx, operation, policy.reason ?? "Policy denied", started);
    }

    if (operation === "validate") {
      const result = await this.validateConnection(ctx);
      auditConnectionAttempt(ctx, result);
      return result;
    }

    const plan = await this.buildPlan(ctx);

    if (ctx.mode === "dry_run" || operation === "dry_run" || operation === "plan") {
      const result = await this.dryRun(ctx, plan);
      auditConnectionAttempt(ctx, result);
      return result;
    }

    if (ctx.mode === "sandbox") {
      const result = await this.dryRun(ctx, { ...plan, mode: "sandbox", summary: `[SANDBOX] ${plan.summary}` });
      result.warnings.push("Sandbox mode — simulated execution only");
      auditConnectionAttempt(ctx, result);
      return result;
    }

    if (!canExecuteReal(ctx)) {
      return this.blocked(
        ctx,
        operation,
        "Real execution blocked — requires production mode, approval, risk clearance, permission, and user confirmation",
        started
      );
    }

    const result = await this.executeReal(ctx, plan);
    auditConnectionAttempt(ctx, result);
    return result;
  }

  protected blocked(
    ctx: ConnectionContext,
    operation: string,
    reason: string,
    started: number
  ): ConnectionResult {
    const auditId = crypto.randomUUID();
    const result: ConnectionResult = {
      success: false,
      provider: this.provider,
      operation,
      mode: ctx.mode,
      output: redactSecrets(reason),
      errors: [reason],
      warnings: [],
      auditId,
      executed: false,
      blockedReason: reason,
      telemetry: {
        latencyMs: Date.now() - started,
        provider: this.provider,
        operation,
        mode: ctx.mode,
        success: false,
        costEstimate: 0,
      },
    };
    auditConnectionAttempt(ctx, result);
    return result;
  }
}
