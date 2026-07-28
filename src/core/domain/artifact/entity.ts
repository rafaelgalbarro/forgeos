/**
 * Artifact model — non-executable knowledge artifacts.
 * PROGRAM 6010
 */

import {
  asArtifactId,
  type ArtifactId,
  type MissionId,
  type VentureId,
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

export type ArtifactType =
  | "RESEARCH"
  | "STRATEGY"
  | "PRD"
  | "ARCHITECTURE"
  | "BUSINESS_MODEL"
  | "BRAND"
  | "MARKETING"
  | "FINANCIALS"
  | "INVESTOR_PACK"
  | "GTM_PLAN"
  | "VALIDATION_REPORT"
  | "PLAN"
  | "SCORE"
  | "REPORT"
  | "OTHER";

export type ArtifactStatus = "DRAFT" | "READY" | "SUPERSEDED" | "ARCHIVED";

export type ArtifactProps = Readonly<{
  id: ArtifactId;
  workspaceId: WorkspaceId;
  missionId?: MissionId;
  ventureId?: VentureId;
  type: ArtifactType;
  title: string;
  summary?: string;
  status: ArtifactStatus;
  version: Version;
  /** Content reference URI/path — never executable code payload */
  contentRef?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreateArtifactInput = Readonly<{
  id: string;
  workspaceId: WorkspaceId;
  type: ArtifactType;
  title: string;
  missionId?: MissionId;
  ventureId?: VentureId;
  summary?: string;
  contentRef?: string;
  version?: string;
  now?: IsoTimestamp;
}>;

export class Artifact {
  private constructor(readonly props: ArtifactProps) {}

  get id(): ArtifactId {
    return this.props.id;
  }

  static create(input: CreateArtifactInput): Result<Artifact, DomainError> {
    const title = input.title.trim();
    if (!title) return err(DomainError.invariant("Artifact", "title required"));
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Artifact({
        id: asArtifactId(input.id),
        workspaceId: input.workspaceId,
        missionId: input.missionId,
        ventureId: input.ventureId,
        type: input.type,
        title,
        summary: input.summary?.trim() || undefined,
        status: "DRAFT",
        version: asVersion(input.version ?? "1.0.0"),
        contentRef: input.contentRef,
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: ArtifactProps): Artifact {
    return new Artifact(props);
  }

  markReady(now: IsoTimestamp = nowTimestamp()): Result<Artifact, DomainError> {
    if (this.props.status !== "DRAFT") {
      return err(DomainError.invalidTransition("Artifact", this.props.status, "READY"));
    }
    return ok(new Artifact({ ...this.props, status: "READY", updatedAt: now }));
  }

  archive(now: IsoTimestamp = nowTimestamp()): Result<Artifact, DomainError> {
    if (this.props.status === "ARCHIVED") {
      return err(DomainError.invalidTransition("Artifact", this.props.status, "ARCHIVED"));
    }
    return ok(new Artifact({ ...this.props, status: "ARCHIVED", updatedAt: now }));
  }

  toSnapshot(): ArtifactProps {
    return this.props;
  }
}
