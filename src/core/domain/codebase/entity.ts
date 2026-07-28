/**
 * Codebase aggregate — source structure only; no execution logs.
 * PROGRAM 6010
 */

import {
  asCodebaseId,
  type CodebaseId,
  type MissionId,
  type OutputId,
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

export type CodebaseKind =
  | "WEBSITE"
  | "WEB_APPLICATION"
  | "MOBILE"
  | "BACKEND"
  | "FULLSTACK";

export type CodebaseStatus =
  | "DRAFT"
  | "GENERATED"
  | "VALIDATED"
  | "READY_FOR_BUILD"
  | "ARCHIVED";

export type CodebaseFileRef = Readonly<{
  path: string;
  language?: string;
  checksum?: string;
}>;

export type CodebaseProps = Readonly<{
  id: CodebaseId;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  ventureId?: VentureId;
  outputId?: OutputId;
  name: string;
  kind: CodebaseKind;
  status: CodebaseStatus;
  version: Version;
  framework?: string;
  language?: string;
  /** File inventory refs only — contents live outside the aggregate */
  fileRefs: readonly CodebaseFileRef[];
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreateCodebaseInput = Readonly<{
  id: string;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  name: string;
  kind: CodebaseKind;
  ventureId?: VentureId;
  outputId?: OutputId;
  framework?: string;
  language?: string;
  version?: string;
  now?: IsoTimestamp;
}>;

export class Codebase {
  private constructor(readonly props: CodebaseProps) {}

  get id(): CodebaseId {
    return this.props.id;
  }

  static create(input: CreateCodebaseInput): Result<Codebase, DomainError> {
    const name = input.name.trim();
    if (!name) return err(DomainError.invariant("Codebase", "name required"));
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Codebase({
        id: asCodebaseId(input.id),
        workspaceId: input.workspaceId,
        missionId: input.missionId,
        ventureId: input.ventureId,
        outputId: input.outputId,
        name,
        kind: input.kind,
        status: "DRAFT",
        version: asVersion(input.version ?? "1.0.0"),
        framework: input.framework,
        language: input.language,
        fileRefs: [],
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: CodebaseProps): Codebase {
    return new Codebase(props);
  }

  replaceFileRefs(
    fileRefs: readonly CodebaseFileRef[],
    now: IsoTimestamp = nowTimestamp()
  ): Codebase {
    return new Codebase({ ...this.props, fileRefs: [...fileRefs], updatedAt: now });
  }

  markReadyForBuild(now: IsoTimestamp = nowTimestamp()): Result<Codebase, DomainError> {
    if (this.props.status !== "VALIDATED" && this.props.status !== "GENERATED") {
      return err(
        DomainError.invalidTransition("Codebase", this.props.status, "READY_FOR_BUILD")
      );
    }
    return ok(new Codebase({ ...this.props, status: "READY_FOR_BUILD", updatedAt: now }));
  }

  setStatus(
    status: CodebaseStatus,
    now: IsoTimestamp = nowTimestamp()
  ): Result<Codebase, DomainError> {
    return ok(new Codebase({ ...this.props, status, updatedAt: now }));
  }

  toSnapshot(): CodebaseProps {
    return this.props;
  }
}
