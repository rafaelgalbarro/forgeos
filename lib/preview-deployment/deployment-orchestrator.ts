/** PROGRAM 5380 — Deployment orchestrator (main entry). */

import type { CodeProject } from "@/lib/code-generation/types";
import { createEmptyCodeProject } from "@/lib/code-generation/code-project";
import { getOrCreateDemoSandboxBuild } from "@/lib/preview-runtime/sandbox-build";
import { getSandboxBuild } from "@/lib/preview-runtime/sandbox-store";
import { getPreviewDeploymentPolicy } from "./config";
import { appendAuditEntry } from "./deployment-audit";
import {
  approveDeploymentRequest,
  createDeploymentRequest,
  rejectDeploymentRequest,
  updateDeploymentStatus,
} from "./deployment-request";
import { buildDeploymentPlan } from "./deployment-planner";
import { runDeploymentSteps, rollbackDeployment } from "./deployment-runner";
import {
  addDeploymentHistoryEntry,
  getDeploymentRequest,
  getDeploymentsForMission,
  saveDeploymentRequest,
} from "./deployment-store";
import {
  allBlockingPreconditionsPassed,
  validateDeploymentPreconditions,
} from "./deployment-validator";
import type {
  DeploymentHistoryEntry,
  PreviewDeploymentInput,
  PreviewDeploymentRequest,
  PreviewDeploymentResult,
} from "./types";

function demoCodeProject(input: PreviewDeploymentInput): CodeProject {
  return createEmptyCodeProject({
    missionId: input.missionId,
    ventureId: input.ventureId,
    projectType: "web_application",
    name: `Mission ${input.missionId}`,
    templateId: "demo-preview",
    framework: "next",
    language: "typescript",
  });
}

export async function createPreviewDeploymentDraft(
  input: PreviewDeploymentInput,
  project?: CodeProject
): Promise<PreviewDeploymentRequest> {
  const policy = getPreviewDeploymentPolicy();
  const codeProject = project ?? demoCodeProject(input);

  let sandboxBuild = getSandboxBuild(input.sandboxBuildId);
  if (!sandboxBuild) {
    sandboxBuild = getOrCreateDemoSandboxBuild(
      input.missionId,
      input.projectId,
      input.projectVersion
    );
  }

  const request = createDeploymentRequest({
    missionId: input.missionId,
    ventureId: input.ventureId,
    projectId: input.projectId,
    projectVersion: input.projectVersion,
    releaseVersion: input.releaseVersion ?? "1.0.0-preview",
    sandboxBuildId: sandboxBuild.buildId,
    dryRun: !policy.enablePreviewDeployment,
  });

  let current = updateDeploymentStatus(request, "VALIDATING", "Validating preconditions");
  const preconditions = await validateDeploymentPreconditions({
    sandboxBuild,
    project: codeProject,
    request: current,
  });

  current = {
    ...current,
    preconditions,
    allPreconditionsPassed: allBlockingPreconditionsPassed(preconditions),
  };

  if (!current.allPreconditionsPassed) {
    current = updateDeploymentStatus(current, "BLOCKED", "Preconditions not met");
    current = appendAuditEntry(current, "blocked", "BLOCKED", "Preconditions failed");
  } else if (policy.requireApproval && current.approval.status === "pending") {
    current = updateDeploymentStatus(current, "AWAITING_APPROVAL", "Awaiting founder approval");
    current = appendAuditEntry(current, "awaiting_approval", "AWAITING_APPROVAL", "Approval required");
  }

  const plan = buildDeploymentPlan(codeProject, current);
  current = { ...current, repository: plan.repository, supabase: plan.supabase, vercel: plan.vercel };

  saveDeploymentRequest(current);
  return current;
}

export async function requestDeploymentApproval(
  deploymentId: string
): Promise<PreviewDeploymentRequest | undefined> {
  const request = getDeploymentRequest(deploymentId);
  if (!request) return undefined;
  const updated = updateDeploymentStatus(request, "AWAITING_APPROVAL", "Approval requested");
  saveDeploymentRequest(updated);
  emitDeploymentNotification(updated, "approval_required");
  return updated;
}

export async function approvePreviewDeployment(
  deploymentId: string,
  approvedBy: string,
  note?: string
): Promise<PreviewDeploymentRequest | undefined> {
  const request = getDeploymentRequest(deploymentId);
  if (!request) return undefined;
  const updated = approveDeploymentRequest(request, approvedBy, note);
  saveDeploymentRequest(updated);
  emitDeploymentNotification(updated, "approved");
  return updated;
}

export async function rejectPreviewDeployment(
  deploymentId: string,
  rejectedBy: string,
  note?: string
): Promise<PreviewDeploymentRequest | undefined> {
  const request = getDeploymentRequest(deploymentId);
  if (!request) return undefined;
  const updated = rejectDeploymentRequest(request, rejectedBy, note);
  saveDeploymentRequest(updated);
  return updated;
}

export async function executePreviewDeployment(
  input: PreviewDeploymentInput,
  project?: CodeProject,
  actor?: string
): Promise<PreviewDeploymentResult> {
  const policy = getPreviewDeploymentPolicy();

  let request =
    getDeploymentsForMission(input.missionId).find(
      (r) => r.status === "APPROVED" || r.status === "AWAITING_APPROVAL"
    ) ??
    (await createPreviewDeploymentDraft(input, project));

  if (policy.requireApproval && request.approval.status !== "approved") {
    if (input.userConfirmed && input.approvalSessionId) {
      request = approveDeploymentRequest(request, input.requestedBy, "Auto-approved via session");
    } else {
      return {
        request: updateDeploymentStatus(request, "AWAITING_APPROVAL"),
        success: false,
        blockedReason: "Approval required before deployment",
      };
    }
  }

  if (!request.allPreconditionsPassed) {
    const refreshed = await createPreviewDeploymentDraft(input, project);
    if (!refreshed.allPreconditionsPassed) {
      return {
        request: refreshed,
        success: false,
        blockedReason: "Preconditions not met — cannot deploy",
      };
    }
    request = refreshed;
  }

  if (!policy.enablePreviewDeployment) {
    request = { ...request, dryRun: true };
  }

  const codeProject = project ?? demoCodeProject(input);
  const result = await runDeploymentSteps(request, codeProject, actor ?? input.requestedBy);
  saveDeploymentRequest(result.request);

  addDeploymentHistoryEntry(toHistoryEntry(result.request));
  emitDeploymentNotification(result.request, result.success ? "deployed" : "failed");

  return result;
}

export async function rollbackPreviewDeployment(
  deploymentId: string,
  actor?: string
): Promise<PreviewDeploymentRequest | undefined> {
  const request = getDeploymentRequest(deploymentId);
  if (!request) return undefined;
  const rolled = await rollbackDeployment(request, actor);
  saveDeploymentRequest(rolled);
  addDeploymentHistoryEntry({ ...toHistoryEntry(rolled), rolledBack: true });
  emitDeploymentNotification(rolled, "rolled_back");
  return rolled;
}

function toHistoryEntry(request: PreviewDeploymentRequest): DeploymentHistoryEntry {
  return {
    deploymentId: request.deploymentId,
    missionId: request.missionId,
    projectVersion: request.projectVersion,
    releaseVersion: request.releaseVersion,
    commitSha: request.codePush?.commitSha,
    provider: "multi",
    previewUrl: request.previewUrl,
    status: request.status,
    deployedAt: request.completedAt ?? request.updatedAt,
    approval: request.approval,
    rolledBack: request.status === "ROLLED_BACK",
    dryRun: request.dryRun,
  };
}

function emitDeploymentNotification(
  request: PreviewDeploymentRequest,
  event: "approval_required" | "approved" | "deployed" | "failed" | "rolled_back"
): void {
  if (typeof window !== "undefined") {
    try {
      const { appendHistoryEntry } = require("@/lib/mission-control/mission-history");
      const labels: Record<string, string> = {
        approval_required: "Preview deployment — approval required",
        approved: "Preview deployment approved",
        deployed: request.dryRun
          ? "Preview deployment plan ready (DRY RUN)"
          : `Preview deployed: ${request.previewUrl ?? "ready"}`,
        failed: "Preview deployment failed",
        rolled_back: "Preview deployment rolled back",
      };
      appendHistoryEntry(request.missionId, labels[event] ?? event, "DEPLOY", "active", request.deploymentId);
    } catch {
      /* non-blocking */
    }
  }
}

export function getDeploymentSnapshot(missionId: string): {
  deployments: PreviewDeploymentRequest[];
  latest?: PreviewDeploymentRequest;
  canPublish: boolean;
} {
  const deployments = getDeploymentsForMission(missionId);
  const latest = deployments[0];
  const canPublish = latest
    ? latest.allPreconditionsPassed && latest.approval.status === "approved"
    : false;
  return { deployments, latest, canPublish };
}
