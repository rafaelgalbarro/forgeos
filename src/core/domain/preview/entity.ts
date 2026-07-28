/**
 * Preview — ephemeral preview of a successful build. Not a release or deployment.
 * PROGRAM 6010
 */

import {
  asPreviewId,
  type BuildId,
  type MissionId,
  type PreviewId,
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

export type PreviewStatus = "PROVISIONING" | "READY" | "EXPIRED" | "FAILED" | "REVOKED";

export type PreviewProps = Readonly<{
  id: PreviewId;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  buildId: BuildId;
  status: PreviewStatus;
  url?: string;
  expiresAt?: IsoTimestamp;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreatePreviewInput = Readonly<{
  id: string;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  buildId: BuildId;
  now?: IsoTimestamp;
}>;

const TRANSITIONS: Record<PreviewStatus, readonly PreviewStatus[]> = {
  PROVISIONING: ["READY", "FAILED"],
  READY: ["EXPIRED", "REVOKED"],
  EXPIRED: [],
  FAILED: [],
  REVOKED: [],
};

export class Preview {
  private constructor(readonly props: PreviewProps) {}

  get id(): PreviewId {
    return this.props.id;
  }

  static create(input: CreatePreviewInput): Result<Preview, DomainError> {
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Preview({
        id: asPreviewId(input.id),
        workspaceId: input.workspaceId,
        missionId: input.missionId,
        buildId: input.buildId,
        status: "PROVISIONING",
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: PreviewProps): Preview {
    return new Preview(props);
  }

  markReady(
    url: string,
    expiresAt?: IsoTimestamp,
    now: IsoTimestamp = nowTimestamp()
  ): Result<Preview, DomainError> {
    if (!url.trim()) return err(DomainError.invariant("Preview", "url required"));
    if (!TRANSITIONS[this.props.status].includes("READY")) {
      return err(DomainError.invalidTransition("Preview", this.props.status, "READY"));
    }
    return ok(
      new Preview({
        ...this.props,
        status: "READY",
        url: url.trim(),
        expiresAt,
        updatedAt: now,
      })
    );
  }

  expire(now: IsoTimestamp = nowTimestamp()): Result<Preview, DomainError> {
    if (!TRANSITIONS[this.props.status].includes("EXPIRED")) {
      return err(DomainError.invalidTransition("Preview", this.props.status, "EXPIRED"));
    }
    return ok(new Preview({ ...this.props, status: "EXPIRED", updatedAt: now }));
  }

  toSnapshot(): PreviewProps {
    return this.props;
  }
}
