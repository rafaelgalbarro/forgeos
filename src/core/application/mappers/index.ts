/** Aggregate → read-model mappers. */

import type {
  Build,
  Codebase,
  Decision,
  Deployment,
  Mission,
  Output,
  Preview,
  Release,
  Venture,
  Workspace,
} from "../compat-domain";
import type {
  BuildStatusView,
  CodebaseSummaryView,
  CodebaseTreeView,
  CompanyOverviewView,
  DeploymentStatusView,
  MissionConversationView,
  MissionDecisionsView,
  MissionOverviewView,
  MissionTimelineView,
  OutputCardView,
  OutputStudioView,
  PreviewStatusView,
  ReleaseStatusView,
  VentureOverviewView,
  WorkspaceOverviewView,
} from "../dto";

export function toMissionOverview(mission: Mission): MissionOverviewView {
  return {
    id: mission.id,
    workspaceId: mission.workspaceId,
    ventureId: mission.ventureId,
    status: mission.status,
    planApproved: mission.planApproved,
    intentPrimary: mission.intent?.primary,
    idea: mission.intent?.extractedIdea,
    decisionCount: mission.decisionIds.length,
    outputCount: mission.outputIds.length,
    updatedAt: mission.updatedAt,
  };
}

export function toMissionConversation(mission: Mission): MissionConversationView {
  return { missionId: mission.id, messages: [...mission.conversation] };
}

export function toMissionTimeline(mission: Mission): MissionTimelineView {
  return { missionId: mission.id, entries: [...mission.timeline] };
}

export function toMissionDecisions(missionId: string, decisions: Decision[]): MissionDecisionsView {
  return {
    missionId,
    decisions: decisions.map((d) => ({
      id: d.id,
      title: d.title,
      status: d.status,
      options: d.options,
      selectedOption: d.selectedOption,
    })),
  };
}

export function toOutputCard(output: Output): OutputCardView {
  return {
    id: output.id,
    missionId: output.missionId,
    kind: output.kind,
    title: output.title,
    status: output.status,
    version: output.version,
  };
}

export function toOutputStudio(output: Output): OutputStudioView {
  return {
    id: output.id,
    missionId: output.missionId,
    kind: output.kind,
    title: output.title,
    summary: output.summary,
    status: output.status,
    version: output.version,
    updatedAt: output.updatedAt,
  };
}

export function toCodebaseSummary(codebase: Codebase): CodebaseSummaryView {
  return {
    id: codebase.id,
    missionId: codebase.missionId,
    status: codebase.status,
    summary: codebase.summary,
    version: codebase.version,
  };
}

export function toCodebaseTree(codebase: Codebase): CodebaseTreeView {
  return {
    id: codebase.id,
    missionId: codebase.missionId,
    status: codebase.status,
    root: codebase.root,
  };
}

export function toBuildStatus(build: Build): BuildStatusView {
  return {
    id: build.id,
    missionId: build.missionId,
    status: build.status,
    attempt: build.attempt,
    updatedAt: build.updatedAt,
  };
}

export function toPreviewStatus(preview: Preview): PreviewStatusView {
  return {
    id: preview.id,
    missionId: preview.missionId,
    status: preview.status,
    url: preview.url,
    updatedAt: preview.updatedAt,
  };
}

export function toReleaseStatus(release: Release): ReleaseStatusView {
  return {
    id: release.id,
    missionId: release.missionId,
    version: release.version,
    status: release.status,
    approvalId: release.approvalId,
    updatedAt: release.updatedAt,
  };
}

export function toDeploymentStatus(deployment: Deployment): DeploymentStatusView {
  return {
    id: deployment.id,
    missionId: deployment.missionId,
    target: deployment.target,
    status: deployment.status,
    releaseId: deployment.releaseId,
    updatedAt: deployment.updatedAt,
  };
}

export function toWorkspaceOverview(
  workspace: Workspace,
  ventureCount: number,
  missionCount: number,
): WorkspaceOverviewView {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    status: workspace.status,
    ventureCount,
    missionCount,
  };
}

export function toVentureOverview(venture: Venture): VentureOverviewView {
  return {
    id: venture.id,
    workspaceId: venture.workspaceId,
    name: venture.name,
    slug: venture.slug,
    status: venture.status,
    idea: venture.idea,
    missionCount: venture.missionIds.length,
  };
}

export function toCompanyOverview(input: {
  workspace: Workspace;
  ventures: number;
  missions: number;
  activeBuilds: number;
  livePreviews: number;
  pendingDecisions: number;
}): CompanyOverviewView {
  return {
    workspaceId: input.workspace.id,
    workspaceName: input.workspace.name,
    ventures: input.ventures,
    missions: input.missions,
    activeBuilds: input.activeBuilds,
    livePreviews: input.livePreviews,
    pendingDecisions: input.pendingDecisions,
  };
}
