/**
 * Flow I — Deployments adapter (NOT_STARTED / documented stub).
 * Never dual-write production deploys until ADAPTER_READY + dry-run evidence.
 */

export interface DeploymentDto {
  id: string;
  missionId: string;
  environment: string;
  status: string;
  updatedAt: string;
}

export const DEPLOYMENTS_ADAPTER_STATUS = "NOT_STARTED" as const;
export const DEPLOYMENTS_STUB_NOTE =
  "Stub — map getDeploymentSnapshot ↔ V2 Deployment/Release; keep ENABLE_PREVIEW_DEPLOYMENT=false.";

export function fromLegacyDeploymentSnapshot(s: {
  id?: string;
  deploymentId?: string;
  missionId?: string;
  environment?: string;
  status?: string;
  updatedAt?: string;
}): DeploymentDto {
  return {
    id: s.id || s.deploymentId || "unknown",
    missionId: s.missionId || "",
    environment: s.environment || "preview",
    status: s.status || "unknown",
    updatedAt: s.updatedAt || new Date(0).toISOString(),
  };
}
