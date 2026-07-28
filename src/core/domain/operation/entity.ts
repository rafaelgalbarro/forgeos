/**
 * Operation — recorded operating activity. Domain does not auto-execute.
 * PROGRAM 6010
 */

import {
  asOperationId,
  type MissionId,
  type OperationId,
  type VentureId,
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

export type OperationKind =
  | "MONITOR"
  | "SUPPORT"
  | "GROWTH"
  | "MAINTENANCE"
  | "INCIDENT"
  | "OTHER";

export type OperationStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export type OperationProps = Readonly<{
  id: OperationId;
  workspaceId: WorkspaceId;
  ventureId: VentureId;
  missionId?: MissionId;
  kind: OperationKind;
  title: string;
  status: OperationStatus;
  notes?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreateOperationInput = Readonly<{
  id: string;
  workspaceId: WorkspaceId;
  ventureId: VentureId;
  kind: OperationKind;
  title: string;
  missionId?: MissionId;
  notes?: string;
  now?: IsoTimestamp;
}>;

export class Operation {
  private constructor(readonly props: OperationProps) {}

  get id(): OperationId {
    return this.props.id;
  }

  static create(input: CreateOperationInput): Result<Operation, DomainError> {
    const title = input.title.trim();
    if (!title) return err(DomainError.invariant("Operation", "title required"));
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Operation({
        id: asOperationId(input.id),
        workspaceId: input.workspaceId,
        ventureId: input.ventureId,
        missionId: input.missionId,
        kind: input.kind,
        title,
        status: "PLANNED",
        notes: input.notes?.trim() || undefined,
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: OperationProps): Operation {
    return new Operation(props);
  }

  activate(now: IsoTimestamp = nowTimestamp()): Result<Operation, DomainError> {
    if (this.props.status !== "PLANNED") {
      return err(DomainError.invalidTransition("Operation", this.props.status, "ACTIVE"));
    }
    return ok(new Operation({ ...this.props, status: "ACTIVE", updatedAt: now }));
  }

  complete(now: IsoTimestamp = nowTimestamp()): Result<Operation, DomainError> {
    if (this.props.status !== "ACTIVE" && this.props.status !== "PLANNED") {
      return err(DomainError.invalidTransition("Operation", this.props.status, "COMPLETED"));
    }
    return ok(new Operation({ ...this.props, status: "COMPLETED", updatedAt: now }));
  }

  toSnapshot(): OperationProps {
    return this.props;
  }
}
