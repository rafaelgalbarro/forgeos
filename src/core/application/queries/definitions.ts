/** Query definitions — Program 6020. */

import type { Query } from "./types";

type Base<TType extends string, TPayload> = Query<TType, TPayload>;

export type GetWorkspaceOverviewQuery = Base<"GetWorkspaceOverview", { workspaceId: string }>;
export type GetVentureOverviewQuery = Base<"GetVentureOverview", { ventureId: string }>;
export type GetMissionOverviewQuery = Base<"GetMissionOverview", { missionId: string }>;
export type GetMissionConversationQuery = Base<"GetMissionConversation", { missionId: string }>;
export type GetMissionTimelineQuery = Base<"GetMissionTimeline", { missionId: string }>;
export type GetMissionDecisionsQuery = Base<"GetMissionDecisions", { missionId: string }>;
export type GetMissionOutputsQuery = Base<"GetMissionOutputs", { missionId: string }>;
export type GetOutputDetailsQuery = Base<"GetOutputDetails", { outputId: string }>;
export type GetCodebaseSummaryQuery = Base<"GetCodebaseSummary", { codebaseId: string }>;
export type GetCodebaseTreeQuery = Base<"GetCodebaseTree", { codebaseId: string }>;
export type GetBuildStatusQuery = Base<"GetBuildStatus", { buildId: string }>;
export type GetPreviewStatusQuery = Base<"GetPreviewStatus", { previewId: string }>;
export type GetReleaseStatusQuery = Base<"GetReleaseStatus", { releaseId: string }>;
export type GetDeploymentStatusQuery = Base<"GetDeploymentStatus", { deploymentId: string }>;
export type GetCompanyOperatingOverviewQuery = Base<
  "GetCompanyOperatingOverview",
  { workspaceId: string }
>;

// PROGRAM 6120 — Value Engine queries
export type GetVentureValueSummaryQuery = Base<"GetVentureValueSummary", { ventureId: string }>;
export type GetVentureValueDetailQuery = Base<"GetVentureValueDetail", { ventureId: string }>;
export type GetValueEvidenceQuery = Base<"GetValueEvidence", { ventureId: string }>;
export type GetValueMilestonesQuery = Base<"GetValueMilestones", { ventureId: string }>;
export type GetValueExperimentsQuery = Base<"GetValueExperiments", { ventureId: string }>;
export type GetVentureEconomicsQuery = Base<"GetVentureEconomics", { ventureId: string }>;
export type GetValueRecommendationsQuery = Base<"GetValueRecommendations", { ventureId: string }>;
export type ComparePortfolioVenturesQuery = Base<"ComparePortfolioVentures", { portfolioId: string }>;
export type GetPortfolioValueSummaryQuery = Base<"GetPortfolioValueSummary", { portfolioId: string }>;

export type ApplicationQuery =
  | GetWorkspaceOverviewQuery
  | GetVentureOverviewQuery
  | GetMissionOverviewQuery
  | GetMissionConversationQuery
  | GetMissionTimelineQuery
  | GetMissionDecisionsQuery
  | GetMissionOutputsQuery
  | GetOutputDetailsQuery
  | GetCodebaseSummaryQuery
  | GetCodebaseTreeQuery
  | GetBuildStatusQuery
  | GetPreviewStatusQuery
  | GetReleaseStatusQuery
  | GetDeploymentStatusQuery
  | GetCompanyOperatingOverviewQuery
  | GetVentureValueSummaryQuery
  | GetVentureValueDetailQuery
  | GetValueEvidenceQuery
  | GetValueMilestonesQuery
  | GetValueExperimentsQuery
  | GetVentureEconomicsQuery
  | GetValueRecommendationsQuery
  | ComparePortfolioVenturesQuery
  | GetPortfolioValueSummaryQuery;

export const QUERY_TYPES = [
  "GetWorkspaceOverview",
  "GetVentureOverview",
  "GetMissionOverview",
  "GetMissionConversation",
  "GetMissionTimeline",
  "GetMissionDecisions",
  "GetMissionOutputs",
  "GetOutputDetails",
  "GetCodebaseSummary",
  "GetCodebaseTree",
  "GetBuildStatus",
  "GetPreviewStatus",
  "GetReleaseStatus",
  "GetDeploymentStatus",
  "GetCompanyOperatingOverview",
  "GetVentureValueSummary",
  "GetVentureValueDetail",
  "GetValueEvidence",
  "GetValueMilestones",
  "GetValueExperiments",
  "GetVentureEconomics",
  "GetValueRecommendations",
  "ComparePortfolioVentures",
  "GetPortfolioValueSummary",
] as const;
