/**
 * PROGRAM 6100 — Segmented performance queries (light DTOs).
 */

export interface FieldSelection {
  fields?: string[];
}

export interface GetMissionCardParams {
  missionId: string;
}

export interface GetMissionSummaryParams {
  missionId: string;
  includeOutputs?: boolean;
  includeWorkflow?: boolean;
}

export interface GetMissionDetailParams {
  missionId: string;
  section?: string;
}

export interface GetVentureCardParams {
  ventureId: string;
}

export interface GetVentureSummaryParams {
  ventureId: string;
}

export interface GetCompanyDashboardParams {
  ventureId: string;
  section?: string;
}

export interface GetCompanySectionDetailParams {
  ventureId: string;
  sectionId: string;
}

export interface GetOutputSummaryParams {
  missionId: string;
  limit?: number;
  cursor?: string;
}

export interface GetOutputDetailParams {
  outputId: string;
}

export interface GetProjectSummaryParams {
  missionId: string;
}

export interface GetProjectManifestParams {
  missionId: string;
}

export interface GetProjectFileParams {
  missionId: string;
  filePath: string;
}

export interface ListPortfolioVenturesParams {
  workspaceId: string;
  limit?: number;
  cursor?: string;
  search?: string;
  sortBy?: "name" | "activity" | "health" | "lifecycle";
  sortDir?: "asc" | "desc";
  lifecycle?: string;
  health?: string;
}

export const PERFORMANCE_QUERY_TYPES = [
  "GetMissionCard",
  "GetMissionSummary",
  "GetMissionDetail",
  "GetVentureCard",
  "GetVentureSummary",
  "GetCompanyDashboard",
  "GetCompanySectionDetail",
  "GetOutputSummary",
  "GetOutputDetail",
  "GetProjectSummary",
  "GetProjectManifest",
  "GetProjectFile",
  "ListPortfolioVentures",
] as const;

export type PerformanceQueryType = (typeof PERFORMANCE_QUERY_TYPES)[number];
