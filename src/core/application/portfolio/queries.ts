/**
 * Portfolio query definitions — PROGRAM 6110
 */

import type { Query } from "../queries/types";
import type { VentureLifecycle, VenturePriority } from "../../domain/portfolio/types";

type Base<TType extends string, TPayload> = Query<TType, TPayload>;

export type GetPortfolioQuery = Base<
  "GetPortfolio",
  { workspaceId: string; portfolioId: string }
>;

export type GetPortfolioSummaryQuery = Base<
  "GetPortfolioSummary",
  { workspaceId: string; portfolioId: string }
>;

export type ListPortfolioVenturesQuery = Base<
  "ListPortfolioVentures",
  {
    workspaceId: string;
    portfolioId: string;
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: "name" | "priority" | "lifecycle" | "updatedAt";
    sortDir?: "asc" | "desc";
    lifecycle?: VentureLifecycle;
    priority?: VenturePriority;
    health?: string;
    valueStatus?: string;
    hasBlockers?: boolean;
    activeExecutions?: boolean;
  }
>;

export type GetPortfolioVentureQuery = Base<
  "GetPortfolioVenture",
  { workspaceId: string; portfolioId: string; ventureId: string }
>;

export type GetPortfolioAllocationsQuery = Base<
  "GetPortfolioAllocations",
  { workspaceId: string; portfolioId: string; ventureId?: string }
>;

export type GetPortfolioDependenciesQuery = Base<
  "GetPortfolioDependencies",
  { workspaceId: string; portfolioId: string }
>;

export type GetSharedAssetsQuery = Base<
  "GetSharedAssets",
  { workspaceId: string; portfolioId: string }
>;

export type GetPortfolioPoliciesQuery = Base<
  "GetPortfolioPolicies",
  { workspaceId: string; portfolioId: string }
>;

export type GetPortfolioDecisionsQuery = Base<
  "GetPortfolioDecisions",
  { workspaceId: string; portfolioId: string }
>;

export type GetPortfolioActivityQuery = Base<
  "GetPortfolioActivity",
  { workspaceId: string; portfolioId: string; limit?: number }
>;

export type GetPortfolioCapacityQuery = Base<
  "GetPortfolioCapacity",
  { workspaceId: string; portfolioId: string }
>;

export type GetPortfolioRisksQuery = Base<
  "GetPortfolioRisks",
  { workspaceId: string; portfolioId: string }
>;

export type PortfolioQuery =
  | GetPortfolioQuery
  | GetPortfolioSummaryQuery
  | ListPortfolioVenturesQuery
  | GetPortfolioVentureQuery
  | GetPortfolioAllocationsQuery
  | GetPortfolioDependenciesQuery
  | GetSharedAssetsQuery
  | GetPortfolioPoliciesQuery
  | GetPortfolioDecisionsQuery
  | GetPortfolioActivityQuery
  | GetPortfolioCapacityQuery
  | GetPortfolioRisksQuery;

export const PORTFOLIO_QUERY_TYPES = [
  "GetPortfolio",
  "GetPortfolioSummary",
  "ListPortfolioVentures",
  "GetPortfolioVenture",
  "GetPortfolioAllocations",
  "GetPortfolioDependencies",
  "GetSharedAssets",
  "GetPortfolioPolicies",
  "GetPortfolioDecisions",
  "GetPortfolioActivity",
  "GetPortfolioCapacity",
  "GetPortfolioRisks",
] as const;
