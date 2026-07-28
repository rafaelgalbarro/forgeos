/** Build / Preview / Release / Deployment stubs (Program 6010). */

import type {
  ActorId,
  BuildId,
  DeploymentId,
  MissionId,
  PreviewId,
  ReleaseId,
  WorkspaceId,
} from "./ids";
import type { DomainEvent } from "./events";

export type BuildStatus = "idle" | "running" | "stopped" | "succeeded" | "failed";
export type PreviewStatus = "idle" | "starting" | "running" | "stopped" | "failed";
export type ReleaseStatus = "draft" | "pending_approval" | "approved" | "rejected";
export type DeploymentStatus = "requested" | "approved" | "deploying" | "live" | "rolled_back" | "failed";
export type DeploymentTarget = "preview" | "staging" | "production";

export interface Build {
  id: BuildId;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  status: BuildStatus;
  attempt: number;
  createdAt: string;
  updatedAt: string;
}

export interface Preview {
  id: PreviewId;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  status: PreviewStatus;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Release {
  id: ReleaseId;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  version: string;
  status: ReleaseStatus;
  approvalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Deployment {
  id: DeploymentId;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  releaseId?: ReleaseId;
  target: DeploymentTarget;
  status: DeploymentStatus;
  createdAt: string;
  updatedAt: string;
}

export function startBuild(
  id: BuildId,
  input: { workspaceId: WorkspaceId; missionId: MissionId },
  now: string,
  attempt = 1,
): { build: Build; events: DomainEvent[] } {
  const build: Build = {
    id,
    workspaceId: input.workspaceId,
    missionId: input.missionId,
    status: "running",
    attempt,
    createdAt: now,
    updatedAt: now,
  };
  return {
    build,
    events: [
      {
        eventId: `evt-build-${id}-${attempt}`,
        type: "BuildStarted",
        occurredAt: now,
        aggregateId: id,
        aggregateType: "Build",
        workspaceId: input.workspaceId,
        payload: { attempt },
      },
    ],
  };
}

export function stopBuild(build: Build, now: string): { build: Build; events: DomainEvent[] } {
  if (build.status !== "running") {
    throw new Error(`Cannot stop build in status ${build.status}`);
  }
  const next: Build = { ...build, status: "stopped", updatedAt: now };
  return {
    build: next,
    events: [
      {
        eventId: `evt-build-stop-${build.id}-${now}`,
        type: "BuildStopped",
        occurredAt: now,
        aggregateId: build.id,
        aggregateType: "Build",
        workspaceId: build.workspaceId,
        payload: {},
      },
    ],
  };
}

export function retryBuild(build: Build, now: string): { build: Build; events: DomainEvent[] } {
  if (build.status !== "failed" && build.status !== "stopped") {
    throw new Error(`Cannot retry build in status ${build.status}`);
  }
  const next: Build = {
    ...build,
    status: "running",
    attempt: build.attempt + 1,
    updatedAt: now,
  };
  return {
    build: next,
    events: [
      {
        eventId: `evt-build-retry-${build.id}-${now}`,
        type: "BuildRetried",
        occurredAt: now,
        aggregateId: build.id,
        aggregateType: "Build",
        workspaceId: build.workspaceId,
        payload: { attempt: next.attempt },
      },
    ],
  };
}

export function createPreview(
  id: PreviewId,
  input: { workspaceId: WorkspaceId; missionId: MissionId },
  now: string,
): { preview: Preview; events: DomainEvent[] } {
  const preview: Preview = {
    id,
    workspaceId: input.workspaceId,
    missionId: input.missionId,
    status: "running",
    url: `https://preview.local/${id}`,
    createdAt: now,
    updatedAt: now,
  };
  return {
    preview,
    events: [
      {
        eventId: `evt-prev-${id}`,
        type: "PreviewCreated",
        occurredAt: now,
        aggregateId: id,
        aggregateType: "Preview",
        workspaceId: input.workspaceId,
        payload: { url: preview.url },
      },
    ],
  };
}

export function stopPreview(preview: Preview, now: string): { preview: Preview; events: DomainEvent[] } {
  if (preview.status !== "running" && preview.status !== "starting") {
    throw new Error(`Cannot stop preview in status ${preview.status}`);
  }
  const next: Preview = { ...preview, status: "stopped", updatedAt: now };
  return {
    preview: next,
    events: [
      {
        eventId: `evt-prev-stop-${preview.id}-${now}`,
        type: "PreviewStopped",
        occurredAt: now,
        aggregateId: preview.id,
        aggregateType: "Preview",
        workspaceId: preview.workspaceId,
        payload: {},
      },
    ],
  };
}

export function createRelease(
  id: ReleaseId,
  input: { workspaceId: WorkspaceId; missionId: MissionId; version: string },
  now: string,
): { release: Release; events: DomainEvent[] } {
  const release: Release = {
    id,
    workspaceId: input.workspaceId,
    missionId: input.missionId,
    version: input.version,
    status: "pending_approval",
    createdAt: now,
    updatedAt: now,
  };
  return {
    release,
    events: [
      {
        eventId: `evt-rel-${id}`,
        type: "ReleaseCreated",
        occurredAt: now,
        aggregateId: id,
        aggregateType: "Release",
        workspaceId: input.workspaceId,
        payload: { version: release.version },
      },
    ],
  };
}

export function approveRelease(
  release: Release,
  actorId: ActorId,
  now: string,
): { release: Release; events: DomainEvent[] } {
  if (release.status !== "pending_approval" && release.status !== "draft") {
    throw new Error(`Cannot approve release in status ${release.status}`);
  }
  const approvalId = `apr-${release.id}`;
  const next: Release = {
    ...release,
    status: "approved",
    approvalId,
    updatedAt: now,
  };
  return {
    release: next,
    events: [
      {
        eventId: `evt-rel-apr-${release.id}-${now}`,
        type: "ReleaseApproved",
        occurredAt: now,
        aggregateId: release.id,
        aggregateType: "Release",
        workspaceId: release.workspaceId,
        payload: { approvalId, actorId },
      },
    ],
  };
}

export function requestDeployment(
  id: DeploymentId,
  input: {
    workspaceId: WorkspaceId;
    missionId: MissionId;
    releaseId?: ReleaseId;
    target: DeploymentTarget;
  },
  now: string,
): { deployment: Deployment; events: DomainEvent[] } {
  const deployment: Deployment = {
    id,
    workspaceId: input.workspaceId,
    missionId: input.missionId,
    releaseId: input.releaseId,
    target: input.target,
    status: "requested",
    createdAt: now,
    updatedAt: now,
  };
  return {
    deployment,
    events: [
      {
        eventId: `evt-dep-${id}`,
        type: "DeploymentRequested",
        occurredAt: now,
        aggregateId: id,
        aggregateType: "Deployment",
        workspaceId: input.workspaceId,
        payload: { target: input.target },
      },
    ],
  };
}

export function approveDeployment(
  deployment: Deployment,
  now: string,
): { deployment: Deployment; events: DomainEvent[] } {
  if (deployment.status !== "requested") {
    throw new Error(`Cannot approve deployment in status ${deployment.status}`);
  }
  const next: Deployment = { ...deployment, status: "approved", updatedAt: now };
  return {
    deployment: next,
    events: [
      {
        eventId: `evt-dep-apr-${deployment.id}-${now}`,
        type: "DeploymentApproved",
        occurredAt: now,
        aggregateId: deployment.id,
        aggregateType: "Deployment",
        workspaceId: deployment.workspaceId,
        payload: { target: deployment.target },
      },
    ],
  };
}

export function rollbackDeployment(
  deployment: Deployment,
  now: string,
): { deployment: Deployment; events: DomainEvent[] } {
  if (deployment.status !== "live" && deployment.status !== "approved" && deployment.status !== "deploying") {
    throw new Error(`Cannot rollback deployment in status ${deployment.status}`);
  }
  const next: Deployment = { ...deployment, status: "rolled_back", updatedAt: now };
  return {
    deployment: next,
    events: [
      {
        eventId: `evt-dep-rb-${deployment.id}-${now}`,
        type: "DeploymentRolledBack",
        occurredAt: now,
        aggregateId: deployment.id,
        aggregateType: "Deployment",
        workspaceId: deployment.workspaceId,
        payload: {},
      },
    ],
  };
}
