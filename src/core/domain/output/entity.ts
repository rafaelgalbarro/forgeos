/**
 * Output model — creation outputs (not code execution).
 * PROGRAM 6010
 */

import {
  asOutputId,
  type ArtifactId,
  type MissionId,
  type OutputId,
  type ProductId,
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
import { canTransitionOutput, type OutputStatusName } from "./transitions";

export type OutputType =
  | "VENTURE_OUTPUT"
  | "WEBSITE_OUTPUT"
  | "WEB_APPLICATION_OUTPUT"
  | "MOBILE_APPLICATION_OUTPUT"
  | "BACKEND_OUTPUT"
  | "DEPLOYMENT_OUTPUT";

export type OutputStatus = OutputStatusName;

export type OutputProps = Readonly<{
  id: OutputId;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  ventureId?: VentureId;
  productId?: ProductId;
  type: OutputType;
  title: string;
  status: OutputStatus;
  version: Version;
  sourceArtifactIds: readonly ArtifactId[];
  previewUrl?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreateOutputInput = Readonly<{
  id: string;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  type: OutputType;
  title: string;
  ventureId?: VentureId;
  productId?: ProductId;
  sourceArtifactIds?: readonly ArtifactId[];
  version?: string;
  now?: IsoTimestamp;
}>;

export class Output {
  private constructor(readonly props: OutputProps) {}

  get id(): OutputId {
    return this.props.id;
  }

  static create(input: CreateOutputInput): Result<Output, DomainError> {
    const title = input.title.trim();
    if (!title) return err(DomainError.invariant("Output", "title required"));
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Output({
        id: asOutputId(input.id),
        workspaceId: input.workspaceId,
        missionId: input.missionId,
        ventureId: input.ventureId,
        productId: input.productId,
        type: input.type,
        title,
        status: "DRAFT",
        version: asVersion(input.version ?? "1.0.0"),
        sourceArtifactIds: input.sourceArtifactIds ?? [],
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: OutputProps): Output {
    return new Output(props);
  }

  transition(
    to: OutputStatus,
    now: IsoTimestamp = nowTimestamp()
  ): Result<Output, DomainError> {
    if (!canTransitionOutput(this.props.status, to)) {
      return err(DomainError.invalidTransition("Output", this.props.status, to));
    }
    return ok(new Output({ ...this.props, status: to, updatedAt: now }));
  }

  toSnapshot(): OutputProps {
    return this.props;
  }
}
