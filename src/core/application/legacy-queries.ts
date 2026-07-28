/**
 * Legacy flat query name contracts (experience / presentation).
 * Renamed from queries.ts so ./queries/* resolves to the CQ queries folder.
 */

export type ApplicationQueryName =
  | "GetMissionOverview"
  | "GetMissionTimeline"
  | "GetMissionConversation"
  | "GetMissionDecisions"
  | "GetMissionOutputs"
  | "GetWorkspaceOverview"
  | "GetVentureOverview"
  | "GetCompanyOperatingOverview"
  | "GetCodebaseSummary"
  | "GetCodebaseTree"
  | "GetBuildStatus"
  | "GetPreviewStatus"
  | "GetReleaseStatus"
  | "GetDeploymentStatus"
  | "GetOutputDetails";

export interface LegacyApplicationQuery {
  name: ApplicationQueryName;
  missionId?: string;
  workspaceId?: string;
  ventureId?: string;
  payload?: Record<string, unknown>;
}

export interface LegacyQueryResult {
  ok: boolean;
  query: ApplicationQueryName | string;
  message: string;
  data?: Record<string, unknown>;
}
