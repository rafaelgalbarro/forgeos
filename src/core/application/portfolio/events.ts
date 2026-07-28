/**
 * Portfolio domain events — PROGRAM 6110
 */

import type { IsoTimestamp } from "../../domain/shared/value-objects";
import type {
  DependencyType,
  PortfolioPolicyKind,
  ResourceType,
  SharedAssetType,
  VentureLifecycle,
  VenturePriority,
} from "../../domain/portfolio/types";

export type PortfolioEventBase = Readonly<{
  eventId: string;
  aggregateId: string;
  workspaceId: string;
  portfolioId: string;
  occurredAt: IsoTimestamp;
  correlationId?: string;
  actorId: string;
}>;

export type PortfolioCreatedEvent = PortfolioEventBase & {
  type: "PortfolioCreated";
  name: string;
  slug: string;
};

export type VentureAddedToPortfolioEvent = PortfolioEventBase & {
  type: "VentureAddedToPortfolio";
  ventureId: string;
  priority: VenturePriority;
  lifecycle: VentureLifecycle;
};

export type VentureRemovedFromPortfolioEvent = PortfolioEventBase & {
  type: "VentureRemovedFromPortfolio";
  ventureId: string;
};

export type VenturePriorityChangedEvent = PortfolioEventBase & {
  type: "VenturePriorityChanged";
  ventureId: string;
  previousPriority: VenturePriority;
  newPriority: VenturePriority;
};

export type VentureLifecycleChangedEvent = PortfolioEventBase & {
  type: "VentureLifecycleChanged";
  ventureId: string;
  previousLifecycle: VentureLifecycle;
  newLifecycle: VentureLifecycle;
  reason: string;
  evidence?: string;
  decisionId?: string;
};

export type VenturePausedEvent = PortfolioEventBase & {
  type: "VenturePaused";
  ventureId: string;
  reason: string;
};

export type VentureResumedEvent = PortfolioEventBase & {
  type: "VentureResumed";
  ventureId: string;
  priority: VenturePriority;
};

export type VentureArchivedEvent = PortfolioEventBase & {
  type: "VentureArchived";
  ventureId: string;
};

export type VentureClosedEvent = PortfolioEventBase & {
  type: "VentureClosed";
  ventureId: string;
};

export type BudgetAllocatedEvent = PortfolioEventBase & {
  type: "BudgetAllocated";
  ventureId: string;
  allocationId: string;
  resourceType: ResourceType;
  limit: number;
};

export type CapabilityAllocatedEvent = PortfolioEventBase & {
  type: "CapabilityAllocated";
  ventureId: string;
  allocationId: string;
  capabilityId: string;
};

export type AllocationReleasedEvent = PortfolioEventBase & {
  type: "AllocationReleased";
  allocationId: string;
  ventureId: string;
};

export type VentureDependencyCreatedEvent = PortfolioEventBase & {
  type: "VentureDependencyCreated";
  dependencyId: string;
  sourceVentureId: string;
  targetVentureId: string;
  dependencyType: DependencyType;
};

export type VentureDependencyRemovedEvent = PortfolioEventBase & {
  type: "VentureDependencyRemoved";
  dependencyId: string;
};

export type SharedAssetRegisteredEvent = PortfolioEventBase & {
  type: "SharedAssetRegistered";
  assetId: string;
  ownerVentureId: string;
  assetType: SharedAssetType;
  name: string;
};

export type SharedAssetUsageApprovedEvent = PortfolioEventBase & {
  type: "SharedAssetUsageApproved";
  assetId: string;
  consumerVentureId: string;
};

export type PortfolioPolicyCreatedEvent = PortfolioEventBase & {
  type: "PortfolioPolicyCreated";
  policyId: string;
  kind: PortfolioPolicyKind;
};

export type PortfolioPolicyChangedEvent = PortfolioEventBase & {
  type: "PortfolioPolicyChanged";
  policyId: string;
  kind: PortfolioPolicyKind;
};

export type PortfolioDecisionRecordedEvent = PortfolioEventBase & {
  type: "PortfolioDecisionRecorded";
  decisionId: string;
  title: string;
  ventureId?: string;
};

export type PortfolioDomainEvent =
  | PortfolioCreatedEvent
  | VentureAddedToPortfolioEvent
  | VentureRemovedFromPortfolioEvent
  | VenturePriorityChangedEvent
  | VentureLifecycleChangedEvent
  | VenturePausedEvent
  | VentureResumedEvent
  | VentureArchivedEvent
  | VentureClosedEvent
  | BudgetAllocatedEvent
  | CapabilityAllocatedEvent
  | AllocationReleasedEvent
  | VentureDependencyCreatedEvent
  | VentureDependencyRemovedEvent
  | SharedAssetRegisteredEvent
  | SharedAssetUsageApprovedEvent
  | PortfolioPolicyCreatedEvent
  | PortfolioPolicyChangedEvent
  | PortfolioDecisionRecordedEvent;

export const PORTFOLIO_EVENT_TYPES = [
  "PortfolioCreated",
  "VentureAddedToPortfolio",
  "VentureRemovedFromPortfolio",
  "VenturePriorityChanged",
  "VentureLifecycleChanged",
  "VenturePaused",
  "VentureResumed",
  "VentureArchived",
  "VentureClosed",
  "BudgetAllocated",
  "CapabilityAllocated",
  "AllocationReleased",
  "VentureDependencyCreated",
  "VentureDependencyRemoved",
  "SharedAssetRegistered",
  "SharedAssetUsageApproved",
  "PortfolioPolicyCreated",
  "PortfolioPolicyChanged",
  "PortfolioDecisionRecorded",
] as const;
