/** PROGRAM 5380 — Deployment request factory. */

import type {
  DeploymentApproval,
  PreviewDeploymentRequest,
  PreviewDeploymentStatus,
  RollbackPlan,
} from "./types";
import { getPreviewDeploymentPolicy } from "./config";

function deploymentId(): string {
  return `pdep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function approvalId(): string {
  return `appr-pdep-${Date.now().toString(36)}`;
}

function rollbackId(): string {
  return `rb-pdep-${Date.now().toString(36)}`;
}

export function createDefaultRollbackPlan(commitSha?: string): RollbackPlan {
  return {
    id: rollbackId(),
    steps: [
      "Cancel in-flight deployment",
      "Deactivate Vercel preview deployment",
      "Revert last commit on preview branch if pushed",
      "Restore Supabase sandbox snapshot if configured",
      "Mark deployment ROLLED_BACK in audit log",
    ],
    revertCommitSha: commitSha,
    deactivatePreview: true,
    cleanupSandbox: false,
    documented: true,
  };
}

export function createPendingApproval(): DeploymentApproval {
  return {
    id: approvalId(),
    status: "pending",
    requestedAt: new Date().toISOString(),
    note: "Founder approval required before preview deployment",
  };
}

export function createDeploymentRequest(input: {
  missionId: string;
  ventureId?: string;
  projectId: string;
  projectVersion: string;
  releaseVersion: string;
  sandboxBuildId: string;
  dryRun?: boolean;
}): PreviewDeploymentRequest {
  const now = new Date().toISOString();
  const policy = getPreviewDeploymentPolicy();
  const dryRun = input.dryRun ?? !policy.enablePreviewDeployment;

  return {
    deploymentId: deploymentId(),
    missionId: input.missionId,
    ventureId: input.ventureId,
    projectId: input.projectId,
    projectVersion: input.projectVersion,
    releaseVersion: input.releaseVersion,
    sandboxBuildId: input.sandboxBuildId,
    status: "DRAFT",
    environment: policy.environment,
    preconditions: [],
    allPreconditionsPassed: false,
    approval: createPendingApproval(),
    smokeTests: [],
    rollbackPlan: createDefaultRollbackPlan(),
    dryRun,
    realExecution: false,
    logs: [`[${now}] Deployment request created`],
    warnings: [],
    errors: [],
    auditTrail: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function updateDeploymentStatus(
  request: PreviewDeploymentRequest,
  status: PreviewDeploymentStatus,
  logMessage?: string
): PreviewDeploymentRequest {
  const now = new Date().toISOString();
  const logs = logMessage ? [...request.logs, `[${now}] ${logMessage}`] : request.logs;
  return {
    ...request,
    status,
    logs,
    updatedAt: now,
    completedAt:
      status === "READY" || status === "READY_WITH_PLAN" || status === "FAILED" || status === "ROLLED_BACK"
        ? now
        : request.completedAt,
  };
}

export function approveDeploymentRequest(
  request: PreviewDeploymentRequest,
  approvedBy: string,
  note?: string
): PreviewDeploymentRequest {
  const now = new Date().toISOString();
  return updateDeploymentStatus(
    {
      ...request,
      approval: {
        ...request.approval,
        status: "approved",
        approvedBy,
        resolvedAt: now,
        note,
      },
    },
    "APPROVED",
    `Approved by ${approvedBy}`
  );
}

export function rejectDeploymentRequest(
  request: PreviewDeploymentRequest,
  rejectedBy: string,
  note?: string
): PreviewDeploymentRequest {
  const now = new Date().toISOString();
  return updateDeploymentStatus(
    {
      ...request,
      approval: {
        ...request.approval,
        status: "rejected",
        approvedBy: rejectedBy,
        resolvedAt: now,
        note,
      },
    },
    "BLOCKED",
    `Rejected by ${rejectedBy}`
  );
}
