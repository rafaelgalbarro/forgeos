/**
 * Build — compile/package job for a codebase. Separated from Preview/Release/Deployment.
 * PROGRAM 6010
 */

import {
  asBuildId,
  type BuildId,
  type CodebaseId,
  type MissionId,
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

export type BuildStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export type BuildProps = Readonly<{
  id: BuildId;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  codebaseId: CodebaseId;
  status: BuildStatus;
  /** Artifact digest / bundle ref — not live logs */
  artifactDigest?: string;
  failureReason?: string;
  startedAt?: IsoTimestamp;
  finishedAt?: IsoTimestamp;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreateBuildInput = Readonly<{
  id: string;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  codebaseId: CodebaseId;
  now?: IsoTimestamp;
}>;

const TRANSITIONS: Record<BuildStatus, readonly BuildStatus[]> = {
  QUEUED: ["RUNNING", "CANCELLED"],
  RUNNING: ["SUCCEEDED", "FAILED", "CANCELLED"],
  SUCCEEDED: [],
  FAILED: [],
  CANCELLED: [],
};

export class Build {
  private constructor(readonly props: BuildProps) {}

  get id(): BuildId {
    return this.props.id;
  }

  static create(input: CreateBuildInput): Result<Build, DomainError> {
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Build({
        id: asBuildId(input.id),
        workspaceId: input.workspaceId,
        missionId: input.missionId,
        codebaseId: input.codebaseId,
        status: "QUEUED",
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: BuildProps): Build {
    return new Build(props);
  }

  start(now: IsoTimestamp = nowTimestamp()): Result<Build, DomainError> {
    return this.transition("RUNNING", { now, startedAt: now });
  }

  succeed(
    artifactDigest: string,
    now: IsoTimestamp = nowTimestamp()
  ): Result<Build, DomainError> {
    return this.transition("SUCCEEDED", {
      now,
      finishedAt: now,
      artifactDigest: artifactDigest.trim(),
    });
  }

  fail(reason: string, now: IsoTimestamp = nowTimestamp()): Result<Build, DomainError> {
    return this.transition("FAILED", {
      now,
      finishedAt: now,
      failureReason: reason.trim(),
    });
  }

  private transition(
    to: BuildStatus,
    patch: Partial<BuildProps> & { now: IsoTimestamp }
  ): Result<Build, DomainError> {
    if (!TRANSITIONS[this.props.status].includes(to)) {
      return err(DomainError.invalidTransition("Build", this.props.status, to));
    }
    const { now, ...rest } = patch;
    return ok(
      new Build({
        ...this.props,
        ...rest,
        status: to,
        updatedAt: now,
      })
    );
  }

  toSnapshot(): BuildProps {
    return this.props;
  }
}
