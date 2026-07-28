/** Authorization policies — Program 6020. Production deploy denied by default. */

import { ApplicationFailure } from "../errors";

export interface PolicyContext {
  actorId: string;
  roles: string[];
  workspaceId?: string;
  target?: string;
}

export interface PolicyResult {
  allowed: boolean;
  reason?: string;
  code?: string;
}

export type Policy = (ctx: PolicyContext) => PolicyResult;

function allow(): PolicyResult {
  return { allowed: true };
}

function deny(reason: string, code = "POLICY_DENIED"): PolicyResult {
  return { allowed: false, reason, code };
}

function requireActor(ctx: PolicyContext): PolicyResult | null {
  if (!ctx.actorId) {
    return deny("Actor identity required", "UNAUTHORIZED");
  }
  return null;
}

export const CanCreateMission: Policy = (ctx) => {
  const missing = requireActor(ctx);
  if (missing) return missing;
  if (!ctx.workspaceId) return deny("workspaceId required");
  return allow();
};

export const CanApproveDecision: Policy = (ctx) => {
  const missing = requireActor(ctx);
  if (missing) return missing;
  if (ctx.roles.includes("viewer")) return deny("Viewers cannot approve decisions");
  return allow();
};

export const CanGenerateOutput: Policy = (ctx) => {
  const missing = requireActor(ctx);
  if (missing) return missing;
  return allow();
};

export const CanStartBuild: Policy = (ctx) => {
  const missing = requireActor(ctx);
  if (missing) return missing;
  if (ctx.roles.includes("viewer")) return deny("Viewers cannot start builds");
  return allow();
};

export const CanCreatePreview: Policy = (ctx) => {
  const missing = requireActor(ctx);
  if (missing) return missing;
  return allow();
};

export const CanApproveRelease: Policy = (ctx) => {
  const missing = requireActor(ctx);
  if (missing) return missing;
  if (!ctx.roles.includes("owner") && !ctx.roles.includes("admin") && !ctx.roles.includes("founder")) {
    return deny("Release approval requires owner/admin/founder");
  }
  return allow();
};

export const CanDeployPreview: Policy = (ctx) => {
  const missing = requireActor(ctx);
  if (missing) return missing;
  return allow();
};

/**
 * Production stays disabled unless future explicit governance enables it.
 * ALWAYS deny by default for Program 6020.
 */
export const CanDeployProduction: Policy = (ctx) => {
  const missing = requireActor(ctx);
  if (missing) return missing;
  return deny(
    "Production deployment is disabled until explicit governance is enabled",
    "PRODUCTION_DEPLOY_DISABLED",
  );
};

export const CanRollbackDeployment: Policy = (ctx) => {
  const missing = requireActor(ctx);
  if (missing) return missing;
  if (!ctx.roles.includes("owner") && !ctx.roles.includes("admin") && !ctx.roles.includes("founder")) {
    return deny("Rollback requires owner/admin/founder");
  }
  return allow();
};

export function assertPolicy(result: PolicyResult): void {
  if (!result.allowed) {
    throw new ApplicationFailure({
      code: result.code ?? "POLICY_DENIED",
      message: result.reason ?? "Policy denied",
      category: "authorization",
      retryable: false,
    });
  }
}
