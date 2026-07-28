/** Program 2035 — Improvement orchestrator: detection → proposal. */

import { runObservationEngine } from "./observation-engine";
import {
  createProposals,
  createRiskAssessment,
  createTechnicalPlan,
} from "./proposal-engine";
import { buildRoadmap } from "./roadmap-engine";
import { proposeBranches } from "./branch-manager";
import { proposePullRequests } from "./pr-generator";
import { simulateAllExecutiveReviews } from "./executive-review";
import { buildHistory } from "./improvement-history";
import {
  computeHealthScore,
  computeAggregateRoi,
  computeAggregateRisk,
} from "./improvement-score";
import { scanTechnicalDebt } from "./technical-debt-engine";
import { analyzePerformance } from "./performance-engine";
import { analyzeUx } from "./ux-engine";
import { analyzeProduct } from "./product-engine";
import { reviewSecurity } from "./security-engine";
import { reviewDocumentation } from "./documentation-engine";
import { reviewArchitecture } from "./architecture-review";
import { reviewDependencies } from "./dependency-review";
import { runQualityReview } from "./quality-review";
import type {
  SelfEvolutionReport,
  SelfEvolutionSnapshot,
  SelfEvolutionLabSnapshot,
} from "./types";
import { SELF_EVOLUTION_VERSION, GOVERNANCE_DISCLAIMER as DISCLAIMER } from "./types";

export function runImprovementEngine(): SelfEvolutionReport {
  const observations = runObservationEngine();
  const proposals = createProposals(observations);
  const riskAssessments = proposals.map(createRiskAssessment);
  const technicalPlans = proposals.map((p) => createTechnicalPlan(p));
  const proposedBranches = proposeBranches(proposals);
  const proposedPrs = proposePullRequests(proposals, proposedBranches);
  const executiveReviews = simulateAllExecutiveReviews(proposals);
  const healthScore = computeHealthScore();
  const roadmap = buildRoadmap(proposals);
  const history = buildHistory(observations, proposals);

  return {
    id: `report-${Date.now()}`,
    generatedAt: new Date().toISOString(),
    observations,
    proposals,
    riskAssessments,
    technicalPlans,
    proposedBranches,
    proposedPrs,
    executiveReviews,
    healthScore,
    roadmap,
    history,
    disclaimer: DISCLAIMER,
    dryRun: true,
  };
}

export function buildSnapshot(report: SelfEvolutionReport): SelfEvolutionSnapshot {
  return {
    report,
    version: SELF_EVOLUTION_VERSION,
    openProposals: report.proposals.filter(
      (p) => p.status === "proposed" || p.status === "draft" || p.status === "executive-review"
    ),
    approvedProposals: report.proposals.filter((p) => p.status === "approved"),
    inProgressProposals: report.proposals.filter((p) => p.status === "in-progress"),
    completedProposals: report.proposals.filter((p) => p.status === "completed"),
    observationFeed: report.observations,
    aggregateRoi: computeAggregateRoi(report.proposals),
    aggregateRisk: computeAggregateRisk(report.proposals),
  };
}

export function runSelfEvolutionEngine(): SelfEvolutionSnapshot {
  const report = runImprovementEngine();
  return buildSnapshot(report);
}

export function runSelfEvolutionLab(): SelfEvolutionLabSnapshot {
  const report = runImprovementEngine();
  const snapshot = buildSnapshot(report);
  const quality = runQualityReview();

  return {
    ...snapshot,
    rawEngines: {
      observations: report.observations.length,
      debtItems: scanTechnicalDebt().length,
      perfIssues: analyzePerformance().length,
      uxIssues: analyzeUx().length,
      productOpportunities: analyzeProduct().length,
      securityFindings: reviewSecurity().length,
      docGaps: reviewDocumentation().length,
      archFindings: reviewArchitecture().length,
      depIssues: reviewDependencies().length,
      qualityFindings: quality.overallScore,
    },
    dryRunOnly: true,
  };
}
