/**
 * Venture aggregate — strategic venture entity.
 * Explicitly excludes code files and build logs.
 * PROGRAM 6010
 */

import {
  asVentureId,
  type FounderId,
  type MissionId,
  type ProductId,
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
  type RiskLevel,
  type SchemaVersion,
} from "../shared/value-objects";

export type VentureStatus =
  | "IDEATION"
  | "VALIDATING"
  | "BUILDING"
  | "OPERATING"
  | "PAUSED"
  | "ARCHIVED";

export type VentureProps = Readonly<{
  id: VentureId;
  workspaceId: WorkspaceId;
  founderId: FounderId;
  name: string;
  slug: string;
  ideaSummary: string;
  status: VentureStatus;
  riskLevel: RiskLevel;
  confidence?: Confidence;
  activeMissionId?: MissionId;
  productIds: readonly ProductId[];
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  metadata: MetadataType;
  schemaVersion: SchemaVersion;
}>;

export type CreateVentureInput = Readonly<{
  id: string;
  workspaceId: WorkspaceId;
  founderId: FounderId;
  name: string;
  slug: string;
  ideaSummary: string;
  riskLevel?: RiskLevel;
  confidence?: Confidence;
  now?: IsoTimestamp;
}>;

export class Venture {
  private constructor(readonly props: VentureProps) {}

  get id(): VentureId {
    return this.props.id;
  }

  static create(input: CreateVentureInput): Result<Venture, DomainError> {
    const name = input.name.trim();
    const slug = input.slug.trim().toLowerCase();
    const ideaSummary = input.ideaSummary.trim();
    if (!name) return err(DomainError.invariant("Venture", "name required"));
    if (!slug) return err(DomainError.invariant("Venture", "slug required"));
    if (!ideaSummary) return err(DomainError.invariant("Venture", "ideaSummary required"));
    const ts = input.now ?? nowTimestamp();
    return ok(
      new Venture({
        id: asVentureId(input.id),
        workspaceId: input.workspaceId,
        founderId: input.founderId,
        name,
        slug,
        ideaSummary,
        status: "IDEATION",
        riskLevel: input.riskLevel ?? "MEDIUM",
        confidence: input.confidence,
        productIds: [],
        createdAt: ts,
        updatedAt: ts,
        metadata: Metadata(),
        schemaVersion: CURRENT_SCHEMA_VERSION,
      })
    );
  }

  static rehydrate(props: VentureProps): Venture {
    return new Venture(props);
  }

  transitionStatus(
    status: VentureStatus,
    now: IsoTimestamp = nowTimestamp()
  ): Result<Venture, DomainError> {
    const allowed: Record<VentureStatus, VentureStatus[]> = {
      IDEATION: ["VALIDATING", "PAUSED", "ARCHIVED"],
      VALIDATING: ["BUILDING", "IDEATION", "PAUSED", "ARCHIVED"],
      BUILDING: ["OPERATING", "VALIDATING", "PAUSED", "ARCHIVED"],
      OPERATING: ["PAUSED", "ARCHIVED"],
      PAUSED: ["IDEATION", "VALIDATING", "BUILDING", "OPERATING", "ARCHIVED"],
      ARCHIVED: [],
    };
    if (!allowed[this.props.status].includes(status)) {
      return err(DomainError.invalidTransition("Venture", this.props.status, status));
    }
    return ok(new Venture({ ...this.props, status, updatedAt: now }));
  }

  linkMission(missionId: MissionId, now: IsoTimestamp = nowTimestamp()): Venture {
    return new Venture({ ...this.props, activeMissionId: missionId, updatedAt: now });
  }

  attachProduct(productId: ProductId, now: IsoTimestamp = nowTimestamp()): Venture {
    if (this.props.productIds.includes(productId)) return this;
    return new Venture({
      ...this.props,
      productIds: [...this.props.productIds, productId],
      updatedAt: now,
    });
  }

  toSnapshot(): VentureProps {
    return this.props;
  }
}
