/**
 * Mission aggregate — coordinates intent through lifecycle phases.
 * Does NOT execute factories; transitions only.
 * PROGRAM 6010
 */

import {
  asMissionId,
  type FounderId,
  type MissionId,
  type VentureId,
  type WorkspaceId,
} from "../shared/ids";
import { DomainError } from "../shared/errors";
import { Metadata, type Metadata as MetadataType } from "../shared/metadata";
import { err, ok, type Result } from "../shared/result";
import {
  CURRENT_SCHEMA_VERSION,
  nowTimestamp,
  type Confidence,
  type IsoTimestamp,
  type SchemaVersion,
} from "../shared/value-objects";
import { canTransitionMission, type MissionStatusName } from "./transitions";

export type MissionStatus = MissionStatusName;

export type MissionIntention =
  | "VENTURE"
  | "WEBSITE"
  | "APPLICATION"
  | "MOBILE"
  | "DISCOVERY"
  | "UNSPECIFIED";

export type MissionPhase =
  | "UNDERSTAND"
  | "PLAN"
  | "BUILD"
  | "VALIDATE"
  | "DEPLOY"
  | "OPERATE"
  | "EVOLVE";

export type MissionProps = Readonly<{
  id: MissionId;
  workspaceId: WorkspaceId;
  founderId: FounderId;
  ventureId?: VentureId;
  title: string;
  intention: MissionIntention;
  status: MissionStatus;
  phase: MissionPhase;
  ideaSummary?: string;
  confidence?: Confidence;
  blockedReason?: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreateMissionInput = Readonly<{
  id: string;
  workspaceId: WorkspaceId;
  founderId: FounderId;
  title: string;
  ventureId?: VentureId;
  intention?: MissionIntention;
  ideaSummary?: string;
  confidence?: Confidence;
  now?: IsoTimestamp;
}>;

const STATUS_DEFAULT_PHASE: Record<MissionStatus, MissionPhase> = {
  DRAFT: "UNDERSTAND",
  UNDERSTANDING: "UNDERSTAND",
  PLANNING: "PLAN",
  BUILDING: "BUILD",
  VALIDATING: "VALIDATE",
  READY_FOR_DEPLOY: "DEPLOY",
  OPERATING: "OPERATE",
  EVOLVING: "EVOLVE",
  PAUSED: "UNDERSTAND",
  BLOCKED: "UNDERSTAND",
  COMPLETED: "OPERATE",
  FAILED: "UNDERSTAND",
};

export class Mission {
  private constructor(readonly props: MissionProps) {}

  get id(): MissionId {
    return this.props.id;
  }

  static create(input: CreateMissionInput): Result<Mission, DomainError> {
    const title = input.title.trim();
    if (!title) return err(DomainError.invariant("Mission", "title required"));
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Mission({
        id: asMissionId(input.id),
        workspaceId: input.workspaceId,
        founderId: input.founderId,
        ventureId: input.ventureId,
        title,
        intention: input.intention ?? "UNSPECIFIED",
        status: "DRAFT",
        phase: "UNDERSTAND",
        ideaSummary: input.ideaSummary?.trim() || undefined,
        confidence: input.confidence,
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: MissionProps): Mission {
    return new Mission(props);
  }

  transition(
    to: MissionStatus,
    options?: { blockedReason?: string; now?: IsoTimestamp }
  ): Result<Mission, DomainError> {
    if (!canTransitionMission(this.props.status, to)) {
      return err(DomainError.invalidTransition("Mission", this.props.status, to));
    }
    if (to === "BLOCKED" && !options?.blockedReason?.trim()) {
      return err(DomainError.invariant("Mission", "blockedReason required when blocking"));
    }
    const now = options?.now ?? nowTimestamp();
    const phase =
      to === "PAUSED" || to === "BLOCKED" || to === "FAILED"
        ? this.props.phase
        : STATUS_DEFAULT_PHASE[to];

    return ok(
      new Mission({
        ...this.props,
        status: to,
        phase,
        blockedReason: to === "BLOCKED" ? options!.blockedReason!.trim() : undefined,
        updatedAt: now,
      })
    );
  }

  setIntention(
    intention: MissionIntention,
    now: IsoTimestamp = nowTimestamp()
  ): Result<Mission, DomainError> {
    if (this.props.status === "COMPLETED" || this.props.status === "FAILED") {
      return err(DomainError.invariant("Mission", "Cannot change intention on terminal mission"));
    }
    return ok(new Mission({ ...this.props, intention, updatedAt: now }));
  }

  toSnapshot(): MissionProps {
    return this.props;
  }
}
