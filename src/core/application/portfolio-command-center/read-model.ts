export type PortfolioViewTab =
  | "OVERVIEW"
  | "VENTURES"
  | "VALUE"
  | "EXECUTIONS"
  | "RESOURCES"
  | "RISKS"
  | "APPROVALS"
  | "SHARED_ASSETS"
  | "ACTIVITY";

export interface PortfolioQuickViewModel {
  portfolioName: string;
  totalVentures: number;
  activeVentures: number;
  pausedVentures: number;
  atRiskVentures: number;
  activeExecutions: number;
  blockers: number;
  approvals: number;
  actualSpend: number;
  estimatedSpend: number;
  knownCurrentValue: number | null;
  nextMilestone: string;
}

export interface PortfolioVentureCardModel {
  ventureId: string;
  name: string;
  lifecycle: string;
  priority: string;
  valueStage: string;
  valueStatus: string;
  evidenceStatus: string;
  creationHealth: "HEALTHY" | "AT_RISK" | "BLOCKED" | "FAILED" | "UNKNOWN";
  activeExecutions: number;
  latestPreview: string | null;
  latestRelease: string | null;
  blockers: string[];
  approvals: number;
  costToNextMilestone: string;
  recommendedAction: string;
}

export interface PortfolioExecutionRow {
  id: string;
  ventureId: string;
  ventureName: string;
  missionId?: string;
  status: "running" | "queued" | "paused" | "blocked" | "failed" | "completed";
  priority: string;
  updatedAt?: string;
}

export interface PortfolioValueRow {
  ventureId: string;
  ventureName: string;
  stage: string;
  evidence: string;
  milestone: string;
  economics: string;
  risk: string;
  confidence: number;
  recommendation: string;
  uncertaintyFlags: string[];
}

export interface PortfolioResourceRow {
  resourceType: string;
  actual: number;
  estimated: number;
  projected: number;
  limit: number;
  reserved: number;
}

export interface PortfolioAlert {
  id: string;
  type:
    | "venture_no_progress"
    | "budget_exhausted"
    | "build_failed"
    | "insufficient_evidence"
    | "critical_risk"
    | "broken_dependency"
    | "pending_approval"
    | "inactive_preview"
    | "blocked_release";
  severity: "info" | "warning" | "critical";
  label: string;
  ventureId?: string;
}

export interface MultiCreateBatchResult {
  name: string;
  status: "created" | "rejected" | "queued" | "blocked";
  ventureId?: string;
  reason?: string;
}

export interface PortfolioCommandCenterReadModel {
  generatedAt: string;
  freshness: "LIVE" | "STALE" | "PARTIAL";
  workspaceId: string;
  portfolioId: string;
  portfolioName: string;
  quickView: PortfolioQuickViewModel;
  tabs: PortfolioViewTab[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  ventures: PortfolioVentureCardModel[];
  executions: PortfolioExecutionRow[];
  value: PortfolioValueRow[];
  resources: PortfolioResourceRow[];
  alerts: PortfolioAlert[];
  approvals: Array<{ id: string; title: string; status: string; ventureId?: string }>;
  sharedAssets: Array<{ id: string; name: string; type: string; ownerVentureId: string; approvalStatus: string }>;
  risks: Array<{ id: string; severity: string; category: string; message: string; ventureId?: string }>;
  activity: Array<{ id: string; at: string; type: string; label: string; ventureId?: string }>;
  errors: string[];
}
