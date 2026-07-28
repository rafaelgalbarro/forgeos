/** Program 2035 — ForgeOS Self Evolution Engine public API. */

export {
  runSelfEvolutionEngine,
  runSelfEvolutionLab,
  runImprovementEngine,
  buildSnapshot,
} from "./improvement-engine";

export { runObservationEngine, getCriticalObservations } from "./observation-engine";
export { createProposals, createRiskAssessment, createTechnicalPlan } from "./proposal-engine";
export { proposeBranch, proposeBranches, simulateBranchCreate } from "./branch-manager";
export { proposePullRequest, proposePullRequests, simulatePrCreate } from "./pr-generator";
export { simulateExecutiveReview, simulateAllExecutiveReviews } from "./executive-review";
export { computeHealthScore, computeAggregateRoi } from "./improvement-score";
export { buildRoadmap } from "./roadmap-engine";
export { scanTechnicalDebt } from "./technical-debt-engine";
export { analyzePerformance } from "./performance-engine";
export { analyzeUx } from "./ux-engine";
export { analyzeProduct } from "./product-engine";
export { reviewSecurity } from "./security-engine";
export { reviewDocumentation } from "./documentation-engine";
export { reviewArchitecture } from "./architecture-review";
export { reviewDependencies } from "./dependency-review";
export { assessCodeHealth, getCodeHealthScore } from "./code-health";
export { runQualityReview } from "./quality-review";
export { buildHistory } from "./improvement-history";

export {
  SELF_EVOLUTION_VERSION,
  GOVERNANCE_DISCLAIMER,
  DRY_RUN_DISCLAIMER,
} from "./types";

export type {
  ObservationSignal,
  ImprovementProposal,
  RiskAssessment,
  TechnicalPlan,
  ProposedBranch,
  ProposedPullRequest,
  ExecutiveReviewSimulation,
  ExecutiveReviewStep,
  RoadmapItem,
  ImprovementHistoryEntry,
  HealthScoreBreakdown,
  SelfEvolutionReport,
  SelfEvolutionSnapshot,
  SelfEvolutionLabSnapshot,
  AffectedArea,
  ProposalStatus,
  ProposalPriority,
  ProposalRisk,
} from "./types";
