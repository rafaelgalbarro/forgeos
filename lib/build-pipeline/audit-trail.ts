/** ForgeOS Build Pipeline — audit trail. */

import { getBuildFlowAuditLog } from "@/lib/real-build-flow/audit";
import { getExecutionAuditLog } from "@/lib/real-execution/execution-audit";
import type { PipelineAuditEntry, PipelineStageId } from "./types";

const MAX_ENTRIES = 200;
const pipelineAudit: PipelineAuditEntry[] = [];

export function appendPipelineAudit(
  entry: Omit<PipelineAuditEntry, "id" | "timestamp">
): PipelineAuditEntry {
  const record: PipelineAuditEntry = {
    ...entry,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };
  pipelineAudit.unshift(record);
  if (pipelineAudit.length > MAX_ENTRIES) pipelineAudit.length = MAX_ENTRIES;
  return record;
}

export function getPipelineAuditLog(ventureId?: string): PipelineAuditEntry[] {
  const local = ventureId
    ? pipelineAudit.filter((e) => e.ventureId === ventureId)
    : [...pipelineAudit];

  const buildFlow = getBuildFlowAuditLog(ventureId).map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    pipelineId: e.flowId,
    ventureId: e.ventureId,
    outcome: e.outcome,
    stage: "audit_trail" as PipelineStageId,
    details: e.details,
  }));

  const execution = getExecutionAuditLog(ventureId).map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    pipelineId: e.requestId,
    ventureId: e.ventureId,
    outcome:
      e.outcome === "executed"
        ? ("executed" as const)
        : e.outcome === "failed"
          ? ("failed" as const)
          : e.outcome === "blocked"
            ? ("blocked" as const)
            : ("dry_run" as const),
    stage: "audit_trail" as PipelineStageId,
    details: e.details || e.capabilityId,
  }));

  return [...local, ...buildFlow, ...execution]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, MAX_ENTRIES);
}

export function auditPipelineDryRun(params: {
  pipelineId: string;
  ventureId: string;
  details: string;
}): PipelineAuditEntry {
  return appendPipelineAudit({
    pipelineId: params.pipelineId,
    ventureId: params.ventureId,
    outcome: "dry_run",
    stage: "dry_run",
    details: params.details,
  });
}

export function auditPipelineExecuted(params: {
  pipelineId: string;
  ventureId: string;
  success: boolean;
  details: string;
}): PipelineAuditEntry {
  return appendPipelineAudit({
    pipelineId: params.pipelineId,
    ventureId: params.ventureId,
    outcome: params.success ? "executed" : "failed",
    stage: "build_report",
    details: params.details,
  });
}
