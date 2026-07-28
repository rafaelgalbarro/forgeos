/** Initial command definitions — Program 6020. */

import type { Command } from "./types";
import type { DeploymentTarget, MissionIntent, MissionStatus } from "../compat-domain";

type Base<TType extends string, TPayload> = Command<TType, TPayload>;

export type CreateWorkspaceCommand = Base<
  "CreateWorkspace",
  { name: string; slug: string; organizationId?: string }
>;
export type CreateVentureCommand = Base<
  "CreateVenture",
  { workspaceId: string; name: string; slug: string; idea?: string }
>;
export type CreateMissionCommand = Base<
  "CreateMission",
  { workspaceId: string; ventureId?: string; idea?: string }
>;
export type UpdateMissionIntentCommand = Base<
  "UpdateMissionIntent",
  { missionId: string; intent: MissionIntent }
>;
export type ApproveMissionPlanCommand = Base<"ApproveMissionPlan", { missionId: string }>;
export type PauseMissionCommand = Base<"PauseMission", { missionId: string }>;
export type ResumeMissionCommand = Base<
  "ResumeMission",
  { missionId: string; resumeTo: MissionStatus }
>;
export type CancelMissionCommand = Base<"CancelMission", { missionId: string }>;

export type RequestDecisionCommand = Base<
  "RequestDecision",
  {
    workspaceId: string;
    missionId: string;
    title: string;
    description: string;
    options: string[];
  }
>;
export type ResolveDecisionCommand = Base<
  "ResolveDecision",
  { decisionId: string; selectedOption: string }
>;

export type PlanOutputCommand = Base<
  "PlanOutput",
  { workspaceId: string; missionId: string; kind: string; title: string }
>;
export type GenerateOutputCommand = Base<"GenerateOutput", { outputId: string; summary?: string }>;
export type RequestOutputChangeCommand = Base<"RequestOutputChange", { outputId: string }>;
export type ApproveOutputCommand = Base<"ApproveOutput", { outputId: string }>;

export type GenerateCodebaseCommand = Base<
  "GenerateCodebase",
  { workspaceId: string; missionId: string; summary?: string }
>;
export type RequestCodeChangeCommand = Base<"RequestCodeChange", { codebaseId: string }>;
export type ApproveCodebaseCommand = Base<"ApproveCodebase", { codebaseId: string }>;

export type StartBuildCommand = Base<"StartBuild", { workspaceId: string; missionId: string }>;
export type StopBuildCommand = Base<"StopBuild", { buildId: string }>;
export type RetryBuildCommand = Base<"RetryBuild", { buildId: string }>;

export type CreatePreviewCommand = Base<"CreatePreview", { workspaceId: string; missionId: string }>;
export type StopPreviewCommand = Base<"StopPreview", { previewId: string }>;

export type CreateReleaseCommand = Base<
  "CreateRelease",
  { workspaceId: string; missionId: string; version: string }
>;
export type ApproveReleaseCommand = Base<"ApproveRelease", { releaseId: string }>;

export type RequestDeploymentCommand = Base<
  "RequestDeployment",
  {
    workspaceId: string;
    missionId: string;
    releaseId?: string;
    target: DeploymentTarget;
  }
>;
export type ApproveDeploymentCommand = Base<"ApproveDeployment", { deploymentId: string }>;
export type RollbackDeploymentCommand = Base<"RollbackDeployment", { deploymentId: string }>;

// PROGRAM 6120 — Venture Value Creation Engine commands
export type CreateValueHypothesisCommand = Base<
  "CreateValueHypothesis",
  {
    ventureId: string;
    statement: string;
    dimension: import("@/src/core/domain").ValueDimension;
    assumptions?: string[];
    invalidationCriteria?: string[];
    confidence?: number;
  }
>;
export type RegisterValueEvidenceCommand = Base<
  "RegisterValueEvidence",
  {
    ventureId: string;
    type: import("@/src/core/domain").EvidenceType;
    source: string;
    provenance: string;
    summary: string;
    relatedHypothesisId?: string;
    affectedMetricId?: string;
    attachmentRef?: string;
    artifactRef?: string;
  }
>;
export type CreateValueMetricCommand = Base<
  "CreateValueMetric",
  {
    ventureId: string;
    kind: import("@/src/core/domain").ValueMetricKind;
    label: string;
    numericValue?: number;
    moneyAmount?: number;
    currency?: string;
    unit?: string;
    valueType: import("@/src/core/domain").MetricValueType;
    source: string;
    confidence?: number;
    period?: string;
  }
>;
export type UpdateValueMetricCommand = Base<
  "UpdateValueMetric",
  {
    metricId: string;
    numericValue?: number;
    moneyAmount?: number;
    currency?: string;
    valueType: import("@/src/core/domain").MetricValueType;
    source: string;
    confidence?: number;
    period?: string;
  }
>;
export type CreateValueMilestoneCommand = Base<
  "CreateValueMilestone",
  {
    ventureId: string;
    name: string;
    target: number;
    current?: number;
    unit: string;
    evidenceRequirements?: string[];
    owner?: string;
  }
>;
export type StartValueExperimentCommand = Base<
  "StartValueExperiment",
  {
    ventureId: string;
    type: import("@/src/core/domain").ExperimentType;
    hypothesisStatement: string;
    audience: string;
    method: string;
    successCriteria: string[];
    failureCriteria: string[];
  }
>;
export type CompleteValueExperimentCommand = Base<
  "CompleteValueExperiment",
  {
    experimentId: string;
    result?: string;
    learning?: string;
    nextAction?: string;
    invalidReason?: string;
    evidenceIds?: string[];
  }
>;
export type CreateValueAssessmentCommand = Base<
  "CreateValueAssessment",
  { ventureId: string; stage?: import("@/src/core/domain").ValueStage; includeOptionalScore?: boolean }
>;
export type CreateValueSnapshotCommand = Base<
  "CreateValueSnapshot",
  { ventureId: string; recommendationId?: string }
>;
export type RequestValueReviewCommand = Base<"RequestValueReview", { ventureId: string }>;
export type ApproveValueRecommendationCommand = Base<
  "ApproveValueRecommendation",
  { recommendationId: string; note?: string }
>;
export type RejectValueRecommendationCommand = Base<
  "RejectValueRecommendation",
  { recommendationId: string; note: string }
>;

export type ApplicationCommand =
  | CreateWorkspaceCommand
  | CreateVentureCommand
  | CreateMissionCommand
  | UpdateMissionIntentCommand
  | ApproveMissionPlanCommand
  | PauseMissionCommand
  | ResumeMissionCommand
  | CancelMissionCommand
  | RequestDecisionCommand
  | ResolveDecisionCommand
  | PlanOutputCommand
  | GenerateOutputCommand
  | RequestOutputChangeCommand
  | ApproveOutputCommand
  | GenerateCodebaseCommand
  | RequestCodeChangeCommand
  | ApproveCodebaseCommand
  | StartBuildCommand
  | StopBuildCommand
  | RetryBuildCommand
  | CreatePreviewCommand
  | StopPreviewCommand
  | CreateReleaseCommand
  | ApproveReleaseCommand
  | RequestDeploymentCommand
  | ApproveDeploymentCommand
  | RollbackDeploymentCommand
  | CreateValueHypothesisCommand
  | RegisterValueEvidenceCommand
  | CreateValueMetricCommand
  | UpdateValueMetricCommand
  | CreateValueMilestoneCommand
  | StartValueExperimentCommand
  | CompleteValueExperimentCommand
  | CreateValueAssessmentCommand
  | CreateValueSnapshotCommand
  | RequestValueReviewCommand
  | ApproveValueRecommendationCommand
  | RejectValueRecommendationCommand;

export const COMMAND_TYPES = [
  "CreateWorkspace",
  "CreateVenture",
  "CreateMission",
  "UpdateMissionIntent",
  "ApproveMissionPlan",
  "PauseMission",
  "ResumeMission",
  "CancelMission",
  "RequestDecision",
  "ResolveDecision",
  "PlanOutput",
  "GenerateOutput",
  "RequestOutputChange",
  "ApproveOutput",
  "GenerateCodebase",
  "RequestCodeChange",
  "ApproveCodebase",
  "StartBuild",
  "StopBuild",
  "RetryBuild",
  "CreatePreview",
  "StopPreview",
  "CreateRelease",
  "ApproveRelease",
  "RequestDeployment",
  "ApproveDeployment",
  "RollbackDeployment",
  "CreateValueHypothesis",
  "RegisterValueEvidence",
  "CreateValueMetric",
  "UpdateValueMetric",
  "CreateValueMilestone",
  "StartValueExperiment",
  "CompleteValueExperiment",
  "CreateValueAssessment",
  "CreateValueSnapshot",
  "RequestValueReview",
  "ApproveValueRecommendation",
  "RejectValueRecommendation",
] as const;

export type CommandType = (typeof COMMAND_TYPES)[number];
