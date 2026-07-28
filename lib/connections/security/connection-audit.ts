/** ForgeOS Real Connections — audit log (RC5). */

import { redactSecrets } from "./secret-redaction";
import type { ConnectionContext } from "../shared/connection-context";
import type { ConnectionAuditEntry, ConnectionProvider, ConnectionResult } from "../shared/types";

const AUDIT_LOG: ConnectionAuditEntry[] = [];
const MAX_AUDIT = 500;

export function auditConnectionAttempt(
  ctx: ConnectionContext,
  result: ConnectionResult
): ConnectionAuditEntry {
  const entry: ConnectionAuditEntry = {
    id: result.auditId || crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    provider: ctx.provider,
    operation: ctx.operation,
    mode: ctx.mode,
    ventureId: ctx.ventureId,
    requestedBy: ctx.requestedBy,
    outcome: result.executed
      ? "executed"
      : result.blockedReason
        ? "blocked"
        : result.success
          ? ctx.mode === "dry_run"
            ? "dry_run"
            : "validated"
          : "failed",
    details: redactSecrets(result.output).slice(0, 2000),
    riskLevel: result.plan?.riskLevel ?? "medium",
  };

  AUDIT_LOG.unshift(entry);
  if (AUDIT_LOG.length > MAX_AUDIT) AUDIT_LOG.pop();
  return entry;
}

export function getConnectionAuditLog(ventureId?: string): ConnectionAuditEntry[] {
  if (ventureId) return AUDIT_LOG.filter((e) => e.ventureId === ventureId);
  return [...AUDIT_LOG];
}

export function getConnectionAuditByProvider(provider: ConnectionProvider): ConnectionAuditEntry[] {
  return AUDIT_LOG.filter((e) => e.provider === provider);
}
