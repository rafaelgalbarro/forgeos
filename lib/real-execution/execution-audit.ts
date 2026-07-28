/** ForgeOS Real Execution — audit log (RC5.1). */

import { redactSecrets } from "@/lib/connections/security/secret-redaction";
import type { ExecutionAuditEntry, ExecutionGate, ExecutionMode } from "./types";
import type { ConnectionProvider } from "@/lib/connections/shared/types";

const AUDIT_LOG: ExecutionAuditEntry[] = [];
const MAX_AUDIT = 500;

export function auditExecutionAttempt(params: {
  requestId: string;
  capabilityId: string;
  provider: ConnectionProvider;
  operation: string;
  ventureId: string;
  requestedBy: string;
  approvedBy?: string;
  mode: ExecutionMode;
  outcome: ExecutionAuditEntry["outcome"];
  gates: ExecutionGate[];
  details: string;
  riskLevel: string;
}): ExecutionAuditEntry {
  const entry: ExecutionAuditEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    requestId: params.requestId,
    capabilityId: params.capabilityId,
    provider: params.provider,
    operation: params.operation,
    ventureId: params.ventureId,
    requestedBy: params.requestedBy,
    approvedBy: params.approvedBy,
    mode: params.mode,
    outcome: params.outcome,
    gatesSummary: params.gates.map((g) => `${g.name}:${g.passed ? "ok" : "fail"}`).join(", "),
    details: redactSecrets(params.details).slice(0, 2000),
    riskLevel: params.riskLevel,
  };

  AUDIT_LOG.unshift(entry);
  if (AUDIT_LOG.length > MAX_AUDIT) AUDIT_LOG.pop();
  return entry;
}

export function getExecutionAuditLog(ventureId?: string): ExecutionAuditEntry[] {
  if (ventureId) return AUDIT_LOG.filter((e) => e.ventureId === ventureId);
  return [...AUDIT_LOG];
}

export function getExecutionAuditByRequest(requestId: string): ExecutionAuditEntry[] {
  return AUDIT_LOG.filter((e) => e.requestId === requestId);
}
