/**
 * EvolutionProposal — proposed platform/venture change.
 * Domain records proposals; it does NOT auto-execute changes.
 * PROGRAM 6010
 */

import {
  asEvolutionProposalId,
  type EvolutionProposalId,
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
  type IsoTimestamp,
  type RiskLevel,
  type SchemaVersion,
} from "../shared/value-objects";

export type EvolutionProposalStatus =
  | "PROPOSED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "DEFERRED"
  | "WITHDRAWN";

export type EvolutionProposalProps = Readonly<{
  id: EvolutionProposalId;
  workspaceId: WorkspaceId;
  ventureId?: VentureId;
  missionId?: MissionId;
  title: string;
  summary: string;
  status: EvolutionProposalStatus;
  riskLevel: RiskLevel;
  /** Intentional change description — not an executable patch */
  proposedChange: string;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreateEvolutionProposalInput = Readonly<{
  id: string;
  workspaceId: WorkspaceId;
  title: string;
  summary: string;
  proposedChange: string;
  ventureId?: VentureId;
  missionId?: MissionId;
  riskLevel?: RiskLevel;
  now?: IsoTimestamp;
}>;

const TRANSITIONS: Record<
  EvolutionProposalStatus,
  readonly EvolutionProposalStatus[]
> = {
  PROPOSED: ["UNDER_REVIEW", "WITHDRAWN"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "DEFERRED", "WITHDRAWN"],
  APPROVED: [],
  REJECTED: [],
  DEFERRED: ["UNDER_REVIEW", "WITHDRAWN"],
  WITHDRAWN: [],
};

export class EvolutionProposal {
  private constructor(readonly props: EvolutionProposalProps) {}

  get id(): EvolutionProposalId {
    return this.props.id;
  }

  static create(input: CreateEvolutionProposalInput): Result<EvolutionProposal, DomainError> {
    const title = input.title.trim();
    const summary = input.summary.trim();
    const proposedChange = input.proposedChange.trim();
    if (!title) return err(DomainError.invariant("EvolutionProposal", "title required"));
    if (!summary) return err(DomainError.invariant("EvolutionProposal", "summary required"));
    if (!proposedChange) {
      return err(DomainError.invariant("EvolutionProposal", "proposedChange required"));
    }
    const ts = input.now ?? nowTimestamp();
    return ok(
      new EvolutionProposal({
        id: asEvolutionProposalId(input.id),
        workspaceId: input.workspaceId,
        ventureId: input.ventureId,
        missionId: input.missionId,
        title,
        summary,
        status: "PROPOSED",
        riskLevel: input.riskLevel ?? "MEDIUM",
        proposedChange,
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: EvolutionProposalProps): EvolutionProposal {
    return new EvolutionProposal(props);
  }

  transition(
    to: EvolutionProposalStatus,
    now: IsoTimestamp = nowTimestamp()
  ): Result<EvolutionProposal, DomainError> {
    if (!TRANSITIONS[this.props.status].includes(to)) {
      return err(
        DomainError.invalidTransition("EvolutionProposal", this.props.status, to)
      );
    }
    return ok(new EvolutionProposal({ ...this.props, status: to, updatedAt: now }));
  }

  toSnapshot(): EvolutionProposalProps {
    return this.props;
  }
}
