/** Program 2035 — ForgeOS Self Evolution Engine type contracts. */

export const SELF_EVOLUTION_VERSION = "2035.0.1" as const;
export const GOVERNANCE_DISCLAIMER =
  "ForgeOS nunca auto-modifica su código. Todas las propuestas requieren aprobación humana." as const;
export const DRY_RUN_DISCLAIMER =
  "Simulación dry-run — sin commits reales ni merge a main" as const;

export type AffectedArea =
  | "build"
  | "runtime"
  | "mesh"
  | "ai-runtime"
  | "skills"
  | "capabilities"
  | "marketplace"
  | "enterprise"
  | "venture-factory"
  | "founder"
  | "ceo"
  | "organization"
  | "live"
  | "factory"
  | "capital"
  | "ux"
  | "security"
  | "documentation"
  | "architecture"
  | "dependencies"
  | "code-health"
  | "performance"
  | "product";

export type ObservationCategory =
  | "build"
  | "runtime"
  | "mesh"
  | "ai"
  | "skills"
  | "capabilities"
  | "marketplace"
  | "enterprise"
  | "venture-factory"
  | "logs"
  | "errors"
  | "warnings"
  | "performance"
  | "ux"
  | "feedback"
  | "code-quality"
  | "routes"
  | "docs";

export type ObservationSeverity = "info" | "warning" | "critical";

export type ProposalStatus =
  | "draft"
  | "proposed"
  | "executive-review"
  | "approved"
  | "rejected"
  | "in-progress"
  | "completed";

export type ProposalPriority = "low" | "medium" | "high" | "critical";
export type ProposalComplexity = "trivial" | "low" | "medium" | "high";
export type ProposalRisk = "low" | "medium" | "high";

export type ExecutiveReviewStage =
  | "ceo"
  | "board"
  | "department-owners"
  | "risk-review"
  | "approval";

export type ExecutiveReviewStatus = "pending" | "in-review" | "approved" | "rejected" | "skipped";

export interface ObservationSignal {
  id: string;
  category: ObservationCategory;
  severity: ObservationSeverity;
  title: string;
  description: string;
  source: string;
  detectedAt: string;
  metric?: string;
  value?: string | number;
  affectedArea: AffectedArea;
  heuristic: true;
  dryRun: true;
}

export interface ImprovementProposal {
  id: string;
  title: string;
  description: string;
  impact: string;
  complexity: ProposalComplexity;
  risk: ProposalRisk;
  priority: ProposalPriority;
  estimatedCostUsd: number;
  estimatedTimeHours: number;
  roiScore: number;
  affectedArea: AffectedArea;
  status: ProposalStatus;
  observationIds: string[];
  createdAt: string;
  updatedAt: string;
  dryRun: true;
  requiresHumanApproval: true;
}

export interface RiskAssessment {
  proposalId: string;
  overallRisk: ProposalRisk;
  factors: Array<{ label: string; level: ProposalRisk; mitigation: string }>;
  rollbackPlan: string;
  dryRun: true;
}

export interface TechnicalPlan {
  proposalId: string;
  summary: string;
  affectedModules: string[];
  affectedFiles: string[];
  testChecklist: string[];
  rollbackSteps: string[];
  migrationNotes: string[];
  executionChecklist: string[];
  dryRun: true;
}

export interface ProposedBranch {
  proposalId: string;
  branchName: string;
  baseBranch: string;
  description: string;
  dryRun: true;
  simulated: true;
}

export interface ProposedPullRequest {
  proposalId: string;
  title: string;
  body: string;
  branchName: string;
  targetBranch: string;
  labels: string[];
  dryRun: true;
  githubApiCalled: false;
  requiresApprovalFlag: true;
}

export interface ExecutiveReviewStep {
  stage: ExecutiveReviewStage;
  label: string;
  status: ExecutiveReviewStatus;
  reviewer: string;
  notes?: string;
  reviewedAt?: string;
}

export interface ExecutiveReviewSimulation {
  proposalId: string;
  steps: ExecutiveReviewStep[];
  currentStage: ExecutiveReviewStage;
  overallStatus: "pending" | "in-review" | "approved" | "rejected";
  dryRun: true;
}

export interface RoadmapItem {
  id: string;
  title: string;
  quarter: string;
  area: AffectedArea;
  priority: ProposalPriority;
  status: "planned" | "in-progress" | "done";
  linkedProposalIds: string[];
}

export interface ImprovementHistoryEntry {
  id: string;
  proposalId: string;
  action: "detected" | "proposed" | "approved" | "rejected" | "completed";
  timestamp: string;
  actor: string;
  notes: string;
}

export interface HealthScoreBreakdown {
  codeHealth: number;
  performance: number;
  ux: number;
  security: number;
  documentation: number;
  architecture: number;
  overall: number;
}

export interface SelfEvolutionReport {
  id: string;
  generatedAt: string;
  observations: ObservationSignal[];
  proposals: ImprovementProposal[];
  riskAssessments: RiskAssessment[];
  technicalPlans: TechnicalPlan[];
  proposedBranches: ProposedBranch[];
  proposedPrs: ProposedPullRequest[];
  executiveReviews: ExecutiveReviewSimulation[];
  healthScore: HealthScoreBreakdown;
  roadmap: RoadmapItem[];
  history: ImprovementHistoryEntry[];
  disclaimer: typeof GOVERNANCE_DISCLAIMER;
  dryRun: true;
}

export interface SelfEvolutionSnapshot {
  report: SelfEvolutionReport;
  version: typeof SELF_EVOLUTION_VERSION;
  openProposals: ImprovementProposal[];
  approvedProposals: ImprovementProposal[];
  inProgressProposals: ImprovementProposal[];
  completedProposals: ImprovementProposal[];
  observationFeed: ObservationSignal[];
  aggregateRoi: number;
  aggregateRisk: ProposalRisk;
}

export interface SelfEvolutionLabSnapshot extends SelfEvolutionSnapshot {
  rawEngines: {
    observations: number;
    debtItems: number;
    perfIssues: number;
    uxIssues: number;
    productOpportunities: number;
    securityFindings: number;
    docGaps: number;
    archFindings: number;
    depIssues: number;
    qualityFindings: number;
  };
  dryRunOnly: true;
}
