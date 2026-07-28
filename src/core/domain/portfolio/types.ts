/**
 * Portfolio domain types — PROGRAM 6110
 */

import type { IsoTimestamp } from "../shared/value-objects";
import type {
  DecisionId,
  PortfolioId,
  SharedAssetId,
  VentureId,
  WorkspaceId,
} from "../shared/ids";

export type VenturePriority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW" | "PAUSED";

export type VentureLifecycle =
  | "IDEA"
  | "DISCOVERING"
  | "VALIDATING"
  | "PLANNING"
  | "BUILDING"
  | "READY_TO_LAUNCH"
  | "LAUNCHED"
  | "OPERATING"
  | "GENERATING_TRACTION"
  | "GENERATING_REVENUE"
  | "PROFITABLE"
  | "SCALING"
  | "AT_RISK"
  | "PAUSED"
  | "ARCHIVED"
  | "CLOSED"
  | "FAILED";

export type ResourceType =
  | "AI_EXECUTION"
  | "TOKEN_BUDGET"
  | "MONETARY_BUDGET"
  | "BUILD_WORKER"
  | "PREVIEW_SANDBOX"
  | "DEPLOYMENT_SLOT"
  | "RESEARCH_CAPACITY"
  | "HUMAN_REVIEW"
  | "STORAGE"
  | "SHARED_SERVICE";

export type AllocationStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "IN_USE"
  | "EXHAUSTED"
  | "BLOCKED"
  | "RELEASED";

export type DependencyType =
  | "TECHNICAL"
  | "COMMERCIAL"
  | "DATA"
  | "BRAND"
  | "INFRASTRUCTURE"
  | "FINANCIAL"
  | "OPERATIONAL";

export type SharedAssetType =
  | "DESIGN_SYSTEM"
  | "AUTH_PACKAGE"
  | "ANALYTICS"
  | "PAYMENT_MODULE"
  | "CRM"
  | "TEMPLATE"
  | "INFRA_MODULE"
  | "RESEARCH"
  | "DATASET"
  | "PROMPT"
  | "API_CLIENT";

export type SharedAssetApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "REVOKED";

export type SecurityClassification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

export type PortfolioPolicyKind =
  | "MAX_ACTIVE_VENTURES"
  | "MAX_SIMULTANEOUS_BUILDS"
  | "MAX_ACTIVE_PREVIEWS"
  | "AI_BUDGET_PER_VENTURE"
  | "AI_BUDGET_PER_PORTFOLIO"
  | "REQUIRED_APPROVALS"
  | "DEPLOYMENT_LIMITS"
  | "CLOSURE_RULES"
  | "ARCHIVAL_RULES"
  | "REUSE_RULES"
  | "PRIVACY_RULES";

export type PortfolioStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";

export type LifecycleTransitionRecord = Readonly<{
  actorId: string;
  reason: string;
  evidence?: string;
  previousState: VentureLifecycle;
  newState: VentureLifecycle;
  timestamp: IsoTimestamp;
  decisionId?: DecisionId;
}>;

export type PortfolioVenture = Readonly<{
  ventureId: VentureId;
  priority: VenturePriority;
  lifecycle: VentureLifecycle;
  paused: boolean;
  archived: boolean;
  closed: boolean;
  addedAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  lifecycleHistory: readonly LifecycleTransitionRecord[];
}>;

export type ResourceAllocation = Readonly<{
  id: string;
  portfolioId: PortfolioId;
  ventureId: VentureId;
  resourceType: ResourceType;
  limit: number;
  used: number;
  reserved: number;
  available: number;
  period: string;
  status: AllocationStatus;
  policy?: string;
  updatedAt: IsoTimestamp;
}>;

export type VentureDependency = Readonly<{
  id: string;
  portfolioId: PortfolioId;
  sourceVentureId: VentureId;
  targetVentureId: VentureId;
  dependencyType: DependencyType;
  description?: string;
  versionConstraint?: string;
  approved: boolean;
  createdAt: IsoTimestamp;
}>;

export type SharedAsset = Readonly<{
  id: SharedAssetId;
  portfolioId: PortfolioId;
  ownerVentureId: VentureId;
  allowedConsumerIds: readonly VentureId[];
  assetType: SharedAssetType;
  name: string;
  version: string;
  compatibility?: string;
  securityClassification: SecurityClassification;
  license?: string;
  restriction?: string;
  provenance?: string;
  approvalStatus: SharedAssetApprovalStatus;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}>;

export type PortfolioPolicy = Readonly<{
  id: string;
  portfolioId: PortfolioId;
  kind: PortfolioPolicyKind;
  config: Record<string, string | number | boolean>;
  enabled: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}>;

export type PortfolioDecision = Readonly<{
  id: string;
  portfolioId: PortfolioId;
  ventureId?: VentureId;
  title: string;
  description: string;
  actorId: string;
  outcome: string;
  evidence?: string;
  recordedAt: IsoTimestamp;
}>;

export type PortfolioExecutionSummary = Readonly<{
  portfolioId: PortfolioId;
  workspaceId: WorkspaceId;
  activeExecutions: number;
  queuedExecutions: number;
  failedExecutions: number;
  pausedVentures: number;
  updatedAt: IsoTimestamp;
}>;

export type SharedCapability = Readonly<{
  capabilityId: string;
  sharedAssetId?: SharedAssetId;
  ventureId: VentureId;
  grantedAt: IsoTimestamp;
}>;
