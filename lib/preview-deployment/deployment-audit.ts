/** PROGRAM 5380 — Deployment audit trail. */

import type { DeploymentAuditEntry, PreviewDeploymentRequest, PreviewDeploymentStatus } from "./types";

function auditId(): string {
  return `audit-pdep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

export function appendAuditEntry(
  request: PreviewDeploymentRequest,
  action: string,
  status: PreviewDeploymentStatus,
  detail: string,
  actor?: string
): PreviewDeploymentRequest {
  const entry: DeploymentAuditEntry = {
    id: auditId(),
    deploymentId: request.deploymentId,
    timestamp: new Date().toISOString(),
    action,
    status,
    detail,
    actor,
  };
  return {
    ...request,
    auditTrail: [entry, ...request.auditTrail].slice(0, 50),
    updatedAt: entry.timestamp,
  };
}

export function formatAuditSummary(request: PreviewDeploymentRequest): string[] {
  return request.auditTrail.slice(0, 10).map(
    (e) => `${e.timestamp.slice(11, 19)} — ${e.action}: ${e.detail}`
  );
}

export function getAuditLogForMission(requests: PreviewDeploymentRequest[]): DeploymentAuditEntry[] {
  return requests
    .flatMap((r) => r.auditTrail)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 50);
}
