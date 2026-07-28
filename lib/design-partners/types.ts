/** Program 5000 — Design Partner Program types */

export const DESIGN_PARTNER_VERSION = "5000.0.0";

export type JourneyStage =
  | "landing"
  | "waitlist"
  | "invite"
  | "register"
  | "workspace"
  | "venture"
  | "ceo"
  | "build"
  | "feedback"
  | "analytics";

export interface JourneyProgress {
  userId?: string;
  workspaceId?: string;
  currentStage: JourneyStage;
  completedStages: JourneyStage[];
  startedAt: string;
  updatedAt: string;
}

export type OrgInviteStatus = "pending" | "accepted" | "expired" | "revoked";
export type WorkspaceInviteStatus = "pending" | "accepted" | "expired" | "revoked";

export interface OrgInvitation {
  id: string;
  orgId: string;
  orgName: string;
  email: string;
  code: string;
  status: OrgInviteStatus;
  invitedBy?: string;
  createdAt: string;
  expiresAt?: string;
  acceptedAt?: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  code: string;
  role: "owner" | "admin" | "member";
  status: WorkspaceInviteStatus;
  invitedBy?: string;
  createdAt: string;
  expiresAt?: string;
  acceptedAt?: string;
}

export type IssueSeverity = "low" | "medium" | "high" | "critical";
export type IssueStatus = "open" | "triaged" | "in-progress" | "resolved" | "closed";

export interface IssueReport {
  id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  status: IssueStatus;
  page: string;
  userId?: string;
  workspaceId?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export type FeatureRequestStatus = "submitted" | "reviewing" | "planned" | "shipped" | "declined";
export type FeatureRequestPriority = "low" | "medium" | "high";

export interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  status: FeatureRequestStatus;
  priority: FeatureRequestPriority;
  votes: number;
  userId?: string;
  workspaceId?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoadmapVote {
  itemId: string;
  userId?: string;
  email?: string;
  votedAt: string;
}

export interface RoadmapItemWithVotes {
  id: string;
  title: string;
  description: string;
  quarter: string;
  status: "shipped" | "in-progress" | "planned";
  category: string;
  voteCount: number;
  userVoted: boolean;
}

export type DesignPartnerAnalyticsEvent =
  | "dp_page_view"
  | "dp_journey_stage"
  | "dp_feedback_view"
  | "dp_roadmap_vote"
  | "dp_feature_request"
  | "dp_issue_report"
  | "dp_nps_submit"
  | "dp_dashboard_view"
  | "dp_executive_report_view";

export interface DesignPartnerAnalyticsRecord {
  id: string;
  event: DesignPartnerAnalyticsEvent;
  path?: string;
  userId?: string;
  workspaceId?: string;
  stage?: JourneyStage;
  label?: string;
  meta?: Record<string, string>;
  timestamp: string;
}

export interface NpsResponse {
  id: string;
  score: number;
  comment?: string;
  userId?: string;
  workspaceId?: string;
  createdAt: string;
}

export interface CustomerHealthScore {
  userId?: string;
  workspaceId?: string;
  email?: string;
  score: number;
  tier: "at-risk" | "neutral" | "healthy" | "champion";
  factors: {
    activation: number;
    retention: number;
    engagement: number;
    feedback: number;
  };
  updatedAt: string;
}

export interface ExecutiveReport {
  id: string;
  period: string;
  title: string;
  summary: string;
  highlights: string[];
  metrics: {
    activePartners: number;
    nps: number;
    retentionRate: number;
    activationRate: number;
    feedbackCount: number;
    issueCount: number;
    aiRequests: number;
    aiCostUsd: number;
  };
  generatedAt: string;
}

export interface SuccessDashboardData {
  nps: { score: number; responses: number; promoters: number; detractors: number };
  retention: { rate: number; cohortSize: number; returningUsers: number };
  activation: { rate: number; started: number; completed: number };
  journeyFunnel: Array<{ stage: JourneyStage; count: number; label: string }>;
}

export interface DesignPartnerDashboardData {
  partnerMode: boolean;
  analyticsEnabled: boolean;
  journey: JourneyProgress | null;
  health: CustomerHealthScore | null;
  success: SuccessDashboardData;
  feedbackCount: number;
  issueCount: number;
  featureRequestCount: number;
  pendingInvites: number;
  aiUsage: {
    requestCount: number;
    totalTokens: number;
    totalCostUsd: number;
    avgLatencyMs: number;
  };
  recentExecutiveReport: ExecutiveReport | null;
}

export interface FeedbackInboxItem {
  id: string;
  source: "beta" | "issue" | "feature" | "nps";
  title: string;
  message: string;
  category?: string;
  severity?: IssueSeverity;
  status?: string;
  page?: string;
  rating?: number;
  createdAt: string;
}
