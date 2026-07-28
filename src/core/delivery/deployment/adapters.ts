/**
 * PROGRAM 6050 — Preview Deployment → Canonical Deployment adapter.
 * dry-run ≠ real deployment.
 */

import type { PreviewDeploymentRequest } from "@/lib/preview-deployment/types";
import type { CanonicalDeployment, DeploymentEnvironment } from "../types";
import { deliveryId } from "../ids";

export function adaptPreviewDeployment(
  req: PreviewDeploymentRequest,
  releaseId: string
): CanonicalDeployment {
  const environment = mapEnvironment(req.environment);
  const dryRun = req.dryRun || !req.realExecution;

  return {
    deploymentId: deliveryId("dep"),
    missionId: req.missionId,
    releaseId,
    environment,
    status: mapStatus(req.status),
    dryRun,
    realExecution: dryRun ? false : Boolean(req.realExecution),
    governed: environment === "PRODUCTION" || environment === "STAGING",
    approval: req.approval
      ? {
          id: req.approval.id,
          status: req.approval.status,
          requestedAt: req.approval.requestedAt,
          resolvedAt: req.approval.resolvedAt,
          approvedBy: req.approval.approvedBy,
          note: req.approval.note,
        }
      : undefined,
    previewUrl: req.previewUrl,
    logs: [...req.logs],
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
    completedAt: req.completedAt,
    legacySource: { system: "preview-deployment", id: req.deploymentId },
  };
}

function mapEnvironment(
  env: PreviewDeploymentRequest["environment"]
): DeploymentEnvironment {
  switch (env) {
    case "preview":
      return "PREVIEW";
    case "sandbox":
      return "SANDBOX";
    case "dry_run":
      return "LOCAL";
    default:
      return "PREVIEW";
  }
}

function mapStatus(status: PreviewDeploymentRequest["status"]): CanonicalDeployment["status"] {
  switch (status) {
    case "READY":
    case "READY_WITH_PLAN":
      return "READY";
    case "FAILED":
      return "FAILED";
    case "ROLLED_BACK":
      return "ROLLED_BACK";
    case "CANCELLED":
      return "CANCELLED";
    case "AWAITING_APPROVAL":
      return "AWAITING_APPROVAL";
    case "APPROVED":
      return "APPROVED";
    case "DEPLOYING":
    case "VERIFYING":
    case "PUSHING_CODE":
    case "CREATING_REPOSITORY":
    case "CONFIGURING_ENVIRONMENT":
      return "IN_PROGRESS";
    case "DRAFT":
      return "DRAFT";
    default:
      return "PLANNED";
  }
}
