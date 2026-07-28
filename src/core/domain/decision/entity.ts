/**
 * Decision model — states only; no chain-of-thought / reasoning blobs.
 * PROGRAM 6010
 */

import {
  asDecisionId,
  type DecisionId,
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

export type DecisionStatus =
  | "PROPOSED"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUPERSEDED"
  | "CANCELLED";

export type DecisionCategory =
  | "PRICING"
  | "BRANDING"
  | "DOMAIN"
  | "ARCHITECTURE"
  | "DEPLOYMENT"
  | "STRATEGY"
  | "OTHER";

export type DecisionOption = Readonly<{
  id: string;
  label: string;
}>;

export type DecisionProps = Readonly<{
  id: DecisionId;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  title: string;
  description: string;
  category: DecisionCategory;
  status: DecisionStatus;
  options: readonly DecisionOption[];
  selectedOptionId?: string;
  /** Opaque reference to a superseding decision — not reasoning text */
  supersededById?: DecisionId;
  important: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  resolvedAt?: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreateDecisionInput = Readonly<{
  id: string;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  title: string;
  description: string;
  category?: DecisionCategory;
  options: readonly DecisionOption[];
  important?: boolean;
  now?: IsoTimestamp;
}>;

const TRANSITIONS: Record<DecisionStatus, readonly DecisionStatus[]> = {
  PROPOSED: ["PENDING", "CANCELLED", "SUPERSEDED"],
  PENDING: ["APPROVED", "REJECTED", "CANCELLED", "SUPERSEDED"],
  APPROVED: ["SUPERSEDED"],
  REJECTED: ["SUPERSEDED"],
  SUPERSEDED: [],
  CANCELLED: [],
};

export class Decision {
  private constructor(readonly props: DecisionProps) {}

  get id(): DecisionId {
    return this.props.id;
  }

  static create(input: CreateDecisionInput): Result<Decision, DomainError> {
    const title = input.title.trim();
    const description = input.description.trim();
    if (!title) return err(DomainError.invariant("Decision", "title required"));
    if (!description) return err(DomainError.invariant("Decision", "description required"));
    if (!input.options.length) {
      return err(DomainError.invariant("Decision", "at least one option required"));
    }
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Decision({
        id: asDecisionId(input.id),
        workspaceId: input.workspaceId,
        missionId: input.missionId,
        title,
        description,
        category: input.category ?? "OTHER",
        status: "PROPOSED",
        options: input.options.map((o) => ({ id: o.id.trim(), label: o.label.trim() })),
        important: input.important ?? false,
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: DecisionProps): Decision {
    return new Decision(props);
  }

  submitForApproval(now: IsoTimestamp = nowTimestamp()): Result<Decision, DomainError> {
    return this.transition("PENDING", { now });
  }

  approve(optionId: string, now: IsoTimestamp = nowTimestamp()): Result<Decision, DomainError> {
    if (!this.props.options.some((o) => o.id === optionId)) {
      return err(DomainError.invariant("Decision", `Unknown option: ${optionId}`));
    }
    return this.transition("APPROVED", { now, selectedOptionId: optionId, resolvedAt: now });
  }

  reject(now: IsoTimestamp = nowTimestamp()): Result<Decision, DomainError> {
    return this.transition("REJECTED", { now, resolvedAt: now });
  }

  cancel(now: IsoTimestamp = nowTimestamp()): Result<Decision, DomainError> {
    return this.transition("CANCELLED", { now, resolvedAt: now });
  }

  supersede(
    by: DecisionId,
    now: IsoTimestamp = nowTimestamp()
  ): Result<Decision, DomainError> {
    return this.transition("SUPERSEDED", { now, supersededById: by, resolvedAt: now });
  }

  private transition(
    to: DecisionStatus,
    patch: {
      now: IsoTimestamp;
      selectedOptionId?: string;
      supersededById?: DecisionId;
      resolvedAt?: IsoTimestamp;
    }
  ): Result<Decision, DomainError> {
    if (!TRANSITIONS[this.props.status].includes(to)) {
      return err(DomainError.invalidTransition("Decision", this.props.status, to));
    }
    return ok(
      new Decision({
        ...this.props,
        status: to,
        selectedOptionId: patch.selectedOptionId ?? this.props.selectedOptionId,
        supersededById: patch.supersededById ?? this.props.supersededById,
        resolvedAt: patch.resolvedAt ?? this.props.resolvedAt,
        updatedAt: patch.now,
      })
    );
  }

  toSnapshot(): DecisionProps {
    return this.props;
  }
}
