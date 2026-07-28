/**
 * Portfolio command definitions — PROGRAM 6110
 */

import type { Command } from "../commands/types";
import type {
  DependencyType,
  PortfolioPolicyKind,
  ResourceType,
  SharedAssetType,
  VentureLifecycle,
  VenturePriority,
} from "../../domain/portfolio/types";

type Base<TType extends string, TPayload> = Command<TType, TPayload>;

export type CreatePortfolioCommand = Base<
  "CreatePortfolio",
  { workspaceId: string; name: string; slug: string; workspaceLimits?: Record<string, number> }
>;

export type AddVentureToPortfolioCommand = Base<
  "AddVentureToPortfolio",
  {
    workspaceId: string;
    portfolioId: string;
    ventureId: string;
    priority?: VenturePriority;
    lifecycle?: VentureLifecycle;
  }
>;

export type RemoveVentureFromPortfolioCommand = Base<
  "RemoveVentureFromPortfolio",
  { workspaceId: string; portfolioId: string; ventureId: string }
>;

export type SetVenturePriorityCommand = Base<
  "SetVenturePriority",
  { workspaceId: string; portfolioId: string; ventureId: string; priority: VenturePriority }
>;

export type SetVentureLifecycleCommand = Base<
  "SetVentureLifecycle",
  {
    workspaceId: string;
    portfolioId: string;
    ventureId: string;
    lifecycle: VentureLifecycle;
    reason: string;
    evidence?: string;
    decisionId?: string;
  }
>;

export type PauseVentureCommand = Base<
  "PauseVenture",
  { workspaceId: string; portfolioId: string; ventureId: string; reason: string }
>;

export type ResumeVentureCommand = Base<
  "ResumeVenture",
  { workspaceId: string; portfolioId: string; ventureId: string; priority: VenturePriority }
>;

export type ArchiveVentureCommand = Base<
  "ArchiveVenture",
  { workspaceId: string; portfolioId: string; ventureId: string }
>;

export type CloseVentureCommand = Base<
  "CloseVenture",
  { workspaceId: string; portfolioId: string; ventureId: string }
>;

export type AllocateBudgetCommand = Base<
  "AllocateBudget",
  {
    workspaceId: string;
    portfolioId: string;
    ventureId: string;
    resourceType: ResourceType;
    limit: number;
    period?: string;
  }
>;

export type AllocateCapabilityCommand = Base<
  "AllocateCapability",
  {
    workspaceId: string;
    portfolioId: string;
    ventureId: string;
    capabilityId: string;
    limit?: number;
  }
>;

export type ReleaseAllocationCommand = Base<
  "ReleaseAllocation",
  { workspaceId: string; portfolioId: string; allocationId: string }
>;

export type CreateVentureDependencyCommand = Base<
  "CreateVentureDependency",
  {
    workspaceId: string;
    portfolioId: string;
    sourceVentureId: string;
    targetVentureId: string;
    dependencyType: DependencyType;
    description?: string;
    versionConstraint?: string;
  }
>;

export type RemoveVentureDependencyCommand = Base<
  "RemoveVentureDependency",
  { workspaceId: string; portfolioId: string; dependencyId: string }
>;

export type RegisterSharedAssetCommand = Base<
  "RegisterSharedAsset",
  {
    workspaceId: string;
    portfolioId: string;
    ownerVentureId: string;
    allowedConsumerIds: string[];
    assetType: SharedAssetType;
    name: string;
    version: string;
    securityClassification?: string;
  }
>;

export type ApproveSharedAssetUsageCommand = Base<
  "ApproveSharedAssetUsage",
  { workspaceId: string; portfolioId: string; assetId: string; consumerVentureId: string }
>;

export type CreatePortfolioPolicyCommand = Base<
  "CreatePortfolioPolicy",
  {
    workspaceId: string;
    portfolioId: string;
    kind: PortfolioPolicyKind;
    config: Record<string, string | number | boolean>;
  }
>;

export type UpdatePortfolioPolicyCommand = Base<
  "UpdatePortfolioPolicy",
  {
    workspaceId: string;
    portfolioId: string;
    policyId: string;
    config: Record<string, string | number | boolean>;
    enabled?: boolean;
  }
>;

export type RecordPortfolioDecisionCommand = Base<
  "RecordPortfolioDecision",
  {
    workspaceId: string;
    portfolioId: string;
    title: string;
    description: string;
    outcome: string;
    ventureId?: string;
    evidence?: string;
  }
>;

export type CreateVentureBatchCommand = Base<
  "CreateVentureBatch",
  {
    workspaceId: string;
    portfolioId: string;
    ventures: Array<{
      name: string;
      slug: string;
      idea?: string;
      priority?: VenturePriority;
      lifecycle?: VentureLifecycle;
    }>;
    startMode: "DRAFT_ONLY" | "CREATE_AND_PLAN" | "CREATE_AND_START" | "SCHEDULED";
    maxBatchSize?: number;
  }
>;

export type PauseVentureBatchCommand = Base<
  "PauseVentureBatch",
  { workspaceId: string; portfolioId: string; ventureIds: string[]; reason: string }
>;

export type ResumeVentureBatchCommand = Base<
  "ResumeVentureBatch",
  {
    workspaceId: string;
    portfolioId: string;
    ventureIds: string[];
    priority: VenturePriority;
  }
>;

export type ChangePriorityBatchCommand = Base<
  "ChangePriorityBatch",
  {
    workspaceId: string;
    portfolioId: string;
    changes: Array<{ ventureId: string; priority: VenturePriority }>;
  }
>;

export type ArchiveVentureBatchCommand = Base<
  "ArchiveVentureBatch",
  { workspaceId: string; portfolioId: string; ventureIds: string[] }
>;

export type RequestPortfolioReviewCommand = Base<
  "RequestPortfolioReview",
  { workspaceId: string; portfolioId: string; reason: string }
>;

export type SchedulePortfolioBuildsCommand = Base<
  "SchedulePortfolioBuilds",
  { workspaceId: string; portfolioId: string; ventureIds: string[] }
>;

export type PortfolioCommand =
  | CreatePortfolioCommand
  | AddVentureToPortfolioCommand
  | RemoveVentureFromPortfolioCommand
  | SetVenturePriorityCommand
  | SetVentureLifecycleCommand
  | PauseVentureCommand
  | ResumeVentureCommand
  | ArchiveVentureCommand
  | CloseVentureCommand
  | AllocateBudgetCommand
  | AllocateCapabilityCommand
  | ReleaseAllocationCommand
  | CreateVentureDependencyCommand
  | RemoveVentureDependencyCommand
  | RegisterSharedAssetCommand
  | ApproveSharedAssetUsageCommand
  | CreatePortfolioPolicyCommand
  | UpdatePortfolioPolicyCommand
  | RecordPortfolioDecisionCommand
  | CreateVentureBatchCommand
  | PauseVentureBatchCommand
  | ResumeVentureBatchCommand
  | ChangePriorityBatchCommand
  | ArchiveVentureBatchCommand
  | RequestPortfolioReviewCommand
  | SchedulePortfolioBuildsCommand;

export const PORTFOLIO_COMMAND_TYPES = [
  "CreatePortfolio",
  "AddVentureToPortfolio",
  "RemoveVentureFromPortfolio",
  "SetVenturePriority",
  "SetVentureLifecycle",
  "PauseVenture",
  "ResumeVenture",
  "ArchiveVenture",
  "CloseVenture",
  "AllocateBudget",
  "AllocateCapability",
  "ReleaseAllocation",
  "CreateVentureDependency",
  "RemoveVentureDependency",
  "RegisterSharedAsset",
  "ApproveSharedAssetUsage",
  "CreatePortfolioPolicy",
  "UpdatePortfolioPolicy",
  "RecordPortfolioDecision",
  "CreateVentureBatch",
  "PauseVentureBatch",
  "ResumeVentureBatch",
  "ChangePriorityBatch",
  "ArchiveVentureBatch",
  "RequestPortfolioReview",
  "SchedulePortfolioBuilds",
] as const;
