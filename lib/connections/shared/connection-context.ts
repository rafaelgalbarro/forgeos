/** ForgeOS Real Connections — execution context (RC5). */

import type { ConnectionMode, ConnectionProvider } from "./types";

export interface ConnectionContext {
  ventureId: string;
  requestedBy: string;
  approvedBy?: string;
  provider: ConnectionProvider;
  operation: string;
  mode: ConnectionMode;
  userConfirmed: boolean;
  approvalGranted: boolean;
  riskAllowed: boolean;
  permissionValid: boolean;
  payload: Record<string, unknown>;
}

export function createConnectionContext(
  partial: Partial<ConnectionContext> & Pick<ConnectionContext, "ventureId" | "requestedBy" | "provider" | "operation">
): ConnectionContext {
  return {
    ventureId: partial.ventureId,
    requestedBy: partial.requestedBy,
    approvedBy: partial.approvedBy,
    provider: partial.provider,
    operation: partial.operation,
    mode: partial.mode ?? "dry_run",
    userConfirmed: partial.userConfirmed ?? false,
    approvalGranted: partial.approvalGranted ?? false,
    riskAllowed: partial.riskAllowed ?? true,
    permissionValid: partial.permissionValid ?? true,
    payload: partial.payload ?? {},
  };
}

export function canExecuteReal(ctx: ConnectionContext): boolean {
  return (
    ctx.mode === "production" &&
    ctx.userConfirmed &&
    ctx.approvalGranted &&
    ctx.riskAllowed &&
    ctx.permissionValid
  );
}
