/** ForgeOS Real Build Flow — audit log (RC5.2). */

import type { RiskLevel } from "@/lib/skills-governance/types";
import type { BuildFlowAuditEntry, BuildFlowEnvironment } from "./types";

const MAX_ENTRIES = 200;
const auditLog: BuildFlowAuditEntry[] = [];

export function appendBuildFlowAudit(
  entry: Omit<BuildFlowAuditEntry, "id" | "timestamp">
): BuildFlowAuditEntry {
  const record: BuildFlowAuditEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  auditLog.unshift(record);
  if (auditLog.length > MAX_ENTRIES) auditLog.length = MAX_ENTRIES;
  return record;
}

export function getBuildFlowAuditLog(ventureId?: string): BuildFlowAuditEntry[] {
  return ventureId ? auditLog.filter((e) => e.ventureId === ventureId) : [...auditLog];
}

export function auditDryRun(params: {
  flowId: string;
  ventureId: string;
  requestedBy: string;
  environment: BuildFlowEnvironment;
  riskLevel: RiskLevel;
  stepsCompleted: number;
  details: string;
}): BuildFlowAuditEntry {
  return appendBuildFlowAudit({
    ...params,
    outcome: "dry_run",
  });
}

export function auditExecuted(params: {
  flowId: string;
  ventureId: string;
  requestedBy: string;
  environment: BuildFlowEnvironment;
  riskLevel: RiskLevel;
  stepsCompleted: number;
  details: string;
  success: boolean;
}): BuildFlowAuditEntry {
  return appendBuildFlowAudit({
    flowId: params.flowId,
    ventureId: params.ventureId,
    requestedBy: params.requestedBy,
    environment: params.environment,
    riskLevel: params.riskLevel,
    stepsCompleted: params.stepsCompleted,
    details: params.details,
    outcome: params.success ? "executed" : "failed",
  });
}
