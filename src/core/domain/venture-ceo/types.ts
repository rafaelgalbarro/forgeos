type PortfolioSourceView = Readonly<{
  portfolioId: string;
  workspaceId: string;
  name: string;
  slug: string;
  status: string;
  summary: {
    totalVentures: number;
    activeVentures: number;
    pausedVentures: number;
    closedVentures: number;
    criticalPriority: number;
    atRiskVentures: number;
    activeExecutions: number;
    queuedExecutions: number;
  };
  capacity: Array<{ resourceType: string; limit: number; used: number; available: number }>;
  ventures: Array<{
    ventureId: string;
    name: string;
    health: "HEALTHY" | "AT_RISK" | "BLOCKED" | "FAILED";
    valueStatus: "UNKNOWN" | "POTENTIAL" | "VALIDATED" | "GENERATING";
    paused: boolean;
    blockers: string[];
    activeExecutions: number;
  }>;
  risks: Array<{ id: string; ventureId?: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; message: string }>;
  activity: Array<{ id: string; at: string; label: string; ventureId?: string }>;
  allocations: Array<{ ventureId: string; available: number; resourceType: string }>;
  dependencies: Array<{ sourceVentureId: string; targetVentureId: string; approved: boolean }>;
  sharedAssets: Array<{ id: string; name: string; assetType: string; ownerVentureId: string; version: string }>;
  policies: Array<{ id: string; kind: string; enabled: boolean; config: Record<string, unknown> }>;
}>;

export type CEOMode = "ADVISORY" | "SUPERVISED" | "AUTONOMOUS_SAFE";

export type CEODecisionType =
  | "PRIORITIZE_VENTURE"
  | "REDUCE_SCOPE"
  | "VALIDATE_BEFORE_BUILD"
  | "ALLOCATE_RESOURCES"
  | "RELEASE_RESOURCES"
  | "START_EXPERIMENT"
  | "LAUNCH"
  | "DELAY_LAUNCH"
  | "REUSE_ASSET"
  | "RESOLVE_DEPENDENCY"
  | "PAUSE"
  | "PIVOT"
  | "MERGE"
  | "CLOSE"
  | "REQUEST_HUMAN_REVIEW";

export type CEORecommendation = Readonly<{
  id: string;
  title: string;
  decisionType: CEODecisionType;
  affectedVentureId: string;
  reason: string;
  evidence: readonly string[];
  missingEvidence: readonly string[];
  confidence: number;
  expectedBenefit: string;
  estimatedCost: string;
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reversibility: "REVERSIBLE" | "PARTIALLY_REVERSIBLE" | "IRREVERSIBLE";
  alternatives: readonly string[];
  requiredApproval: boolean;
  recommendedDeadline: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUPERSEDED";
  createdAt: string;
}>;

export type CEOBrief = Readonly<{
  id: string;
  portfolioId: string;
  generatedAt: string;
  freshness: "LIVE" | "STALE";
  portfolioStatus: string;
  changesSinceLastReview: readonly string[];
  topOpportunities: readonly string[];
  topRisks: readonly string[];
  blockedVentures: readonly string[];
  resourcesSummary: readonly string[];
  valueMilestones: readonly string[];
  decisionsRequired: readonly string[];
  recommendedActions: readonly string[];
  inputFingerprint: string;
}>;

export type CEODecisionAuditEvent =
  | "CEOBriefGenerated"
  | "CEORecommendationCreated"
  | "CEORecommendationApproved"
  | "CEORecommendationRejected"
  | "CEOActionExecuted"
  | "CEOModeChanged";

export type CEOAuditRecord = Readonly<{
  id: string;
  type: CEODecisionAuditEvent;
  at: string;
  recommendationId?: string;
  mode?: CEOMode;
  detail: string;
}>;

export type CEOApprovalGate = Readonly<{
  decisionType: CEODecisionType;
  requiresApproval: boolean;
  reason: string;
}>;

export type CEORoutingRecord = Readonly<{
  provider: string;
  model: string;
  promptVersion: string;
  tokenUsageEstimate: number;
  estimatedCost: number;
  latencyMs: number;
  outputValidation: "PASS" | "WARN";
}>;

export type CEOReadSources = Readonly<{
  portfolio: PortfolioSourceView;
  valueSnapshots: ReadonlyArray<{
    ventureId: string;
    stage?: string;
    confidence?: number;
    missingEvidence?: readonly string[];
  }>;
  evidence: ReadonlyArray<{ ventureId: string; summary: string; type?: string }>;
  economics: ReadonlyArray<{ ventureId: string; hasActualRevenue: boolean }>;
  resourceAllocations: ReadonlyArray<{ ventureId: string; available: number; resourceType: string }>;
  activeExecutions: ReadonlyArray<{ ventureId: string; count: number }>;
  risks: ReadonlyArray<{ ventureId?: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; message: string }>;
  blockers: ReadonlyArray<{ ventureId: string; message: string }>;
  approvals: ReadonlyArray<{ id: string; status: string; title: string }>;
  policies: ReadonlyArray<{ kind: string; enabled: boolean; config: Record<string, unknown> }>;
  dependencies: ReadonlyArray<{ sourceVentureId: string; targetVentureId: string; approved: boolean }>;
  activity: ReadonlyArray<{ id: string; label: string; at: string; ventureId?: string }>;
}>;

