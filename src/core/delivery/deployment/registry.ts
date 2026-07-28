/**
 * PROGRAM 6050 — Deployment Registry
 * Deployment references a Release. Production is governed. dry-run ≠ real deployment.
 */

import type {
  CanonicalDeployment,
  CanonicalRelease,
  DeploymentEnvironment,
  DeploymentStatus,
  ApprovalRecord,
} from "../types";
import { deliveryId } from "../ids";

export class DeploymentRelationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeploymentRelationError";
  }
}

export interface DeploymentRegistry {
  create(deployment: CanonicalDeployment, release: CanonicalRelease): CanonicalDeployment;
  get(deploymentId: string): CanonicalDeployment | undefined;
  listByMission(missionId: string): CanonicalDeployment[];
  listByRelease(releaseId: string): CanonicalDeployment[];
  updateStatus(deploymentId: string, status: DeploymentStatus, patch?: Partial<CanonicalDeployment>): CanonicalDeployment;
}

export function assertDeploymentReleaseRelation(
  deployment: Pick<CanonicalDeployment, "releaseId" | "environment" | "dryRun" | "realExecution" | "governed" | "approval">,
  release: CanonicalRelease
): void {
  if (deployment.releaseId !== release.releaseId) {
    throw new DeploymentRelationError("Deployment releaseId mismatch");
  }
  if (!release.immutable || release.status !== "PUBLISHED") {
    throw new DeploymentRelationError(
      `Deployment requires a PUBLISHED immutable release; got ${release.status}`
    );
  }
  if (deployment.dryRun && deployment.realExecution) {
    throw new DeploymentRelationError("dry-run cannot claim realExecution=true");
  }
  if (deployment.environment === "PRODUCTION") {
    if (!deployment.governed) {
      throw new DeploymentRelationError("PRODUCTION deployments must be governed");
    }
    if (!deployment.dryRun && deployment.approval?.status !== "approved") {
      throw new DeploymentRelationError("PRODUCTION real deployment requires approval");
    }
  }
}

export function createDeploymentRegistry(): DeploymentRegistry {
  const store = new Map<string, CanonicalDeployment>();
  const missionIndex = new Map<string, string[]>();

  return {
    create(deployment, release) {
      assertDeploymentReleaseRelation(deployment, release);
      store.set(deployment.deploymentId, deployment);
      const ids = missionIndex.get(deployment.missionId) ?? [];
      if (!ids.includes(deployment.deploymentId)) {
        missionIndex.set(deployment.missionId, [...ids, deployment.deploymentId]);
      }
      return deployment;
    },
    get(deploymentId) {
      return store.get(deploymentId);
    },
    listByMission(missionId) {
      return (missionIndex.get(missionId) ?? [])
        .map((id) => store.get(id))
        .filter(Boolean) as CanonicalDeployment[];
    },
    listByRelease(releaseId) {
      return Array.from(store.values()).filter((d) => d.releaseId === releaseId);
    },
    updateStatus(deploymentId, status, patch) {
      const existing = store.get(deploymentId);
      if (!existing) throw new DeploymentRelationError(`Deployment ${deploymentId} not found`);
      const next: CanonicalDeployment = {
        ...existing,
        ...patch,
        status,
        updatedAt: new Date().toISOString(),
        completedAt:
          status === "READY" || status === "FAILED" || status === "ROLLED_BACK"
            ? new Date().toISOString()
            : existing.completedAt,
      };
      if (next.dryRun && next.realExecution) {
        throw new DeploymentRelationError("dry-run cannot claim realExecution=true");
      }
      store.set(deploymentId, next);
      return next;
    },
  };
}

export function createDeployment(input: {
  missionId: string;
  releaseId: string;
  environment: DeploymentEnvironment;
  dryRun: boolean;
  governed?: boolean;
  approval?: ApprovalRecord;
  status?: DeploymentStatus;
}): CanonicalDeployment {
  const now = new Date().toISOString();
  const governed =
    input.governed ?? (input.environment === "PRODUCTION" || input.environment === "STAGING");
  return {
    deploymentId: deliveryId("dep"),
    missionId: input.missionId,
    releaseId: input.releaseId,
    environment: input.environment,
    status: input.status ?? (input.dryRun ? "PLANNED" : "DRAFT"),
    dryRun: input.dryRun,
    realExecution: false,
    governed,
    approval: input.approval,
    logs: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Never declare real deployment for dry-run results. */
export function describeDeploymentOutcome(d: CanonicalDeployment): string {
  if (d.dryRun) {
    return `DRY_RUN — plan only for ${d.environment}; not a real deployment`;
  }
  if (d.realExecution && d.status === "READY") {
    return `REAL deployment to ${d.environment} READY`;
  }
  return `Deployment ${d.status} (${d.environment}) realExecution=${d.realExecution}`;
}
