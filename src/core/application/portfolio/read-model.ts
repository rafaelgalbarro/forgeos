/**
 * Portfolio read model — PROGRAM 6110
 */

import type {
  DependencyType,
  PortfolioPolicyKind,
  ResourceType,
  SharedAssetType,
  VentureLifecycle,
  VenturePriority,
} from "../../domain/portfolio/types";
import type { FreshnessStatus } from "../company-dashboard/read-model";

export type VenturePortfolioCard = Readonly<{
  ventureId: string;
  name: string;
  slug: string;
  priority: VenturePriority;
  lifecycle: VentureLifecycle;
  paused: boolean;
  archived: boolean;
  closed: boolean;
  health: "HEALTHY" | "AT_RISK" | "BLOCKED" | "FAILED";
  valueStatus: "UNKNOWN" | "POTENTIAL" | "VALIDATED" | "GENERATING";
  blockers: string[];
  activeExecutions: number;
  latestActivity?: string;
  updatedAt: string;
}>;

export type PortfolioAllocationView = Readonly<{
  id: string;
  ventureId: string;
  resourceType: ResourceType;
  limit: number;
  used: number;
  reserved: number;
  available: number;
  status: string;
  period: string;
}>;

export type PortfolioDependencyView = Readonly<{
  id: string;
  sourceVentureId: string;
  targetVentureId: string;
  dependencyType: DependencyType;
  approved: boolean;
  risk: "LOW" | "MEDIUM" | "HIGH";
}>;

export type SharedAssetView = Readonly<{
  id: string;
  name: string;
  assetType: SharedAssetType;
  ownerVentureId: string;
  approvalStatus: string;
  version: string;
}>;

export type PortfolioPolicyView = Readonly<{
  id: string;
  kind: PortfolioPolicyKind;
  enabled: boolean;
  config: Record<string, string | number | boolean>;
}>;

export type PortfolioRiskView = Readonly<{
  id: string;
  ventureId?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  category: string;
  message: string;
}>;

export type PortfolioActivityEntry = Readonly<{
  id: string;
  at: string;
  type: string;
  label: string;
  ventureId?: string;
}>;

export type PortfolioCapacityView = Readonly<{
  resourceType: ResourceType;
  limit: number;
  used: number;
  available: number;
  utilizationPercent: number;
}>;

export type PortfolioSummaryView = Readonly<{
  portfolioId: string;
  workspaceId: string;
  name: string;
  totalVentures: number;
  activeVentures: number;
  pausedVentures: number;
  closedVentures: number;
  criticalPriority: number;
  atRiskVentures: number;
  activeExecutions: number;
  queuedExecutions: number;
}>;

export interface PortfolioReadModel {
  generatedAt: string;
  freshness: FreshnessStatus;
  portfolioId: string;
  workspaceId: string;
  name: string;
  slug: string;
  status: string;
  summary: PortfolioSummaryView;
  metrics: PortfolioSummaryView;
  capacity: PortfolioCapacityView[];
  ventures: VenturePortfolioCard[];
  risks: PortfolioRiskView[];
  activity: PortfolioActivityEntry[];
  allocations: PortfolioAllocationView[];
  dependencies: PortfolioDependencyView[];
  sharedAssets: SharedAssetView[];
  policies: PortfolioPolicyView[];
  decisions: Array<{
    id: string;
    title: string;
    outcome: string;
    recordedAt: string;
    ventureId?: string;
  }>;
}

export type ListPortfolioVenturesResult = Readonly<{
  items: VenturePortfolioCard[];
  total: number;
  page: number;
  pageSize: number;
}>;
