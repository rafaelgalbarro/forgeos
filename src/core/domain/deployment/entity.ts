/**
 * Deployment — placing a published release into an environment.
 * Distinct from Build / Preview / Release.
 * PROGRAM 6010
 */

import {
  asDeploymentId,
  type DeploymentId,
  type MissionId,
  type ReleaseId,
  type WorkspaceId,
} from "../shared/ids";
import { DomainError } from "../shared/errors";
import { Metadata, type Metadata as MetadataType } from "../shared/metadata";
import { err, ok, type Result } from "../shared/result";
import {
  CURRENT_SCHEMA_VERSION,
  nowTimestamp,
  type IsoTimestamp,
  type SchemaVersion,
} from "../shared/value-objects";

export type DeploymentEnvironment = "PREVIEW" | "STAGING" | "PRODUCTION";

export type DeploymentStatus =
  | "REQUESTED"
  | "IN_PROGRESS"
  | "LIVE"
  | "ROLLED_BACK"
  | "FAILED"
  | "CANCELLED";

export type DeploymentProps = Readonly<{
  id: DeploymentId;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  releaseId: ReleaseId;
  environment: DeploymentEnvironment;
  status: DeploymentStatus;
  url?: string;
  failureReason?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  completedAt?: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreateDeploymentInput = Readonly<{
  id: string;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  releaseId: ReleaseId;
  environment: DeploymentEnvironment;
  now?: IsoTimestamp;
}>;

const TRANSITIONS: Record<DeploymentStatus, readonly DeploymentStatus[]> = {
  REQUESTED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["LIVE", "FAILED", "CANCELLED"],
  LIVE: ["ROLLED_BACK"],
  ROLLED_BACK: [],
  FAILED: [],
  CANCELLED: [],
};

export class Deployment {
  private constructor(readonly props: DeploymentProps) {}

  get id(): DeploymentId {
    return this.props.id;
  }

  static create(input: CreateDeploymentInput): Result<Deployment, DomainError> {
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Deployment({
        id: asDeploymentId(input.id),
        workspaceId: input.workspaceId,
        missionId: input.missionId,
        releaseId: input.releaseId,
        environment: input.environment,
        status: "REQUESTED",
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: DeploymentProps): Deployment {
    return new Deployment(props);
  }

  start(now: IsoTimestamp = nowTimestamp()): Result<Deployment, DomainError> {
    return this.transition("IN_PROGRESS", { now });
  }

  markLive(url: string, now: IsoTimestamp = nowTimestamp()): Result<Deployment, DomainError> {
    if (!url.trim()) return err(DomainError.invariant("Deployment", "url required"));
    return this.transition("LIVE", { now, url: url.trim(), completedAt: now });
  }

  fail(reason: string, now: IsoTimestamp = nowTimestamp()): Result<Deployment, DomainError> {
    return this.transition("FAILED", {
      now,
      failureReason: reason.trim(),
      completedAt: now,
    });
  }

  rollback(now: IsoTimestamp = nowTimestamp()): Result<Deployment, DomainError> {
    return this.transition("ROLLED_BACK", { now, completedAt: now });
  }

  private transition(
    to: DeploymentStatus,
    patch: Partial<DeploymentProps> & { now: IsoTimestamp }
  ): Result<Deployment, DomainError> {
    if (!TRANSITIONS[this.props.status].includes(to)) {
      return err(DomainError.invalidTransition("Deployment", this.props.status, to));
    }
    const { now, ...rest } = patch;
    return ok(
      new Deployment({
        ...this.props,
        ...rest,
        status: to,
        updatedAt: now,
      })
    );
  }

  toSnapshot(): DeploymentProps {
    return this.props;
  }
}
