/** ForgeOS Real Connections — policy enforcement (RC5). */

import type { ConnectionContext } from "../shared/connection-context";
import type { ConnectionMode } from "../shared/types";

export interface ConnectionPolicyResult {
  allowed: boolean;
  reason?: string;
  effectiveMode: ConnectionMode;
}

export function enforceConnectionPolicy(ctx: ConnectionContext): ConnectionPolicyResult {
  if (!ctx.permissionValid) {
    return { allowed: false, reason: "Permission denied", effectiveMode: "dry_run" };
  }

  if (!ctx.riskAllowed) {
    return { allowed: false, reason: "Risk engine blocked operation", effectiveMode: "dry_run" };
  }

  if (ctx.mode === "production") {
    if (!ctx.approvalGranted) {
      return {
        allowed: false,
        reason: "Production execution requires governance approval",
        effectiveMode: "dry_run",
      };
    }
    if (!ctx.userConfirmed) {
      return {
        allowed: false,
        reason: "Production execution requires explicit user confirmation",
        effectiveMode: "dry_run",
      };
    }
    if (process.env.FORGEOS_CONNECTIONS_PRODUCTION !== "true") {
      return {
        allowed: false,
        reason: "Production flag FORGEOS_CONNECTIONS_PRODUCTION not enabled",
        effectiveMode: "dry_run",
      };
    }
  }

  return { allowed: true, effectiveMode: ctx.mode };
}

export function defaultConnectionMode(): ConnectionMode {
  return "dry_run";
}

export function isProductionEnabled(): boolean {
  return process.env.FORGEOS_CONNECTIONS_PRODUCTION === "true";
}
