/** Read-model DTOs / views — UI should consume these, not aggregates. */

export interface WorkspaceOverviewView {
  id: string;
  name: string;
  slug: string;
  status: string;
  ventureCount: number;
  missionCount: number;
}

export interface VentureOverviewView {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  status: string;
  idea?: string;
  missionCount: number;
}

export interface MissionOverviewView {
  id: string;
  workspaceId: string;
  ventureId?: string;
  status: string;
  planApproved: boolean;
  intentPrimary?: string;
  idea?: string;
  decisionCount: number;
  outputCount: number;
  updatedAt: string;
}

export interface MissionConversationView {
  missionId: string;
  messages: Array<{ id: string; role: string; content: string; at: string }>;
}

export interface MissionTimelineView {
  missionId: string;
  entries: Array<{ id: string; at: string; label: string; type: string }>;
}

export interface MissionDecisionsView {
  missionId: string;
  decisions: Array<{
    id: string;
    title: string;
    status: string;
    options: string[];
    selectedOption?: string;
  }>;
}

export interface OutputCardView {
  id: string;
  missionId: string;
  kind: string;
  title: string;
  status: string;
  version: number;
}

export interface OutputStudioView {
  id: string;
  missionId: string;
  kind: string;
  title: string;
  summary?: string;
  status: string;
  version: number;
  updatedAt: string;
}

export interface CodebaseSummaryView {
  id: string;
  missionId: string;
  status: string;
  summary?: string;
  version: number;
}

export interface CodebaseTreeView {
  id: string;
  missionId: string;
  status: string;
  root: { path: string; kind: "file" | "dir"; children?: CodebaseTreeView["root"][] };
}

export interface BuildStatusView {
  id: string;
  missionId: string;
  status: string;
  attempt: number;
  updatedAt: string;
}

export interface PreviewStatusView {
  id: string;
  missionId: string;
  status: string;
  url?: string;
  updatedAt: string;
}

export interface ReleaseStatusView {
  id: string;
  missionId: string;
  version: string;
  status: string;
  approvalId?: string;
  updatedAt: string;
}

export interface DeploymentStatusView {
  id: string;
  missionId: string;
  target: string;
  status: string;
  releaseId?: string;
  updatedAt: string;
}

export interface CompanyOverviewView {
  workspaceId: string;
  workspaceName: string;
  ventures: number;
  missions: number;
  activeBuilds: number;
  livePreviews: number;
  pendingDecisions: number;
}
