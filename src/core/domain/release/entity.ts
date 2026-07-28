/**
 * Release — versioned shippable unit from a successful build.
 * Distinct from Preview and Deployment.
 * PROGRAM 6010
 */

import {
  asReleaseId,
  type BuildId,
  type MissionId,
  type ReleaseId,
  type WorkspaceId,
} from "../shared/ids";
import { DomainError } from "../shared/errors";
import { Metadata, type Metadata as MetadataType } from "../shared/metadata";
import { err, ok, type Result } from "../shared/result";
import {
  CURRENT_SCHEMA_VERSION,
  asVersion,
  nowTimestamp,
  type IsoTimestamp,
  type SchemaVersion,
  type Version,
} from "../shared/value-objects";

export type ReleaseStatus =
  | "DRAFT"
  | "CANDIDATE"
  | "APPROVED"
  | "PUBLISHED"
  | "YANKED"
  | "SUPERSEDED";

export type ReleaseProps = Readonly<{
  id: ReleaseId;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  buildId: BuildId;
  version: Version;
  status: ReleaseStatus;
  changelog?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  publishedAt?: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreateReleaseInput = Readonly<{
  id: string;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  buildId: BuildId;
  version: string;
  changelog?: string;
  now?: IsoTimestamp;
}>;

const TRANSITIONS: Record<ReleaseStatus, readonly ReleaseStatus[]> = {
  DRAFT: ["CANDIDATE", "YANKED"],
  CANDIDATE: ["APPROVED", "DRAFT", "YANKED"],
  APPROVED: ["PUBLISHED", "YANKED"],
  PUBLISHED: ["SUPERSEDED", "YANKED"],
  YANKED: [],
  SUPERSEDED: [],
};

export class Release {
  private constructor(readonly props: ReleaseProps) {}

  get id(): ReleaseId {
    return this.props.id;
  }

  static create(input: CreateReleaseInput): Result<Release, DomainError> {
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Release({
        id: asReleaseId(input.id),
        workspaceId: input.workspaceId,
        missionId: input.missionId,
        buildId: input.buildId,
        version: asVersion(input.version),
        status: "DRAFT",
        changelog: input.changelog?.trim() || undefined,
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: ReleaseProps): Release {
    return new Release(props);
  }

  transition(
    to: ReleaseStatus,
    now: IsoTimestamp = nowTimestamp()
  ): Result<Release, DomainError> {
    if (!TRANSITIONS[this.props.status].includes(to)) {
      return err(DomainError.invalidTransition("Release", this.props.status, to));
    }
    return ok(
      new Release({
        ...this.props,
        status: to,
        updatedAt: now,
        publishedAt: to === "PUBLISHED" ? now : this.props.publishedAt,
      })
    );
  }

  toSnapshot(): ReleaseProps {
    return this.props;
  }
}
