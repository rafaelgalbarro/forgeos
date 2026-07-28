/** Program 2035 — Aggregate health & improvement scores. */

import type { HealthScoreBreakdown, ImprovementProposal, ProposalRisk } from "./types";
import { getCodeHealthScore, assessCodeHealth } from "./code-health";
import { getPerformanceScore, analyzePerformance } from "./performance-engine";
import { getUxScore, analyzeUx } from "./ux-engine";
import { getSecurityScore, reviewSecurity } from "./security-engine";
import { getDocumentationScore, reviewDocumentation } from "./documentation-engine";
import { getArchitectureScore, reviewArchitecture } from "./architecture-review";

export function computeHealthScore(): HealthScoreBreakdown {
  const codeHealth = getCodeHealthScore(assessCodeHealth());
  const performance = getPerformanceScore(analyzePerformance());
  const ux = getUxScore(analyzeUx());
  const security = getSecurityScore(reviewSecurity());
  const documentation = getDocumentationScore(reviewDocumentation());
  const architecture = getArchitectureScore(reviewArchitecture());
  const overall = Math.round(
    (codeHealth + performance + ux + security + documentation + architecture) / 6
  );
  return { codeHealth, performance, ux, security, documentation, architecture, overall };
}

export function computeAggregateRoi(proposals: ImprovementProposal[]): number {
  if (proposals.length === 0) return 0;
  const sum = proposals.reduce((s, p) => s + p.roiScore, 0);
  return Math.round((sum / proposals.length) * 10) / 10;
}

export function computeAggregateRisk(proposals: ImprovementProposal[]): ProposalRisk {
  if (proposals.some((p) => p.risk === "high")) return "high";
  if (proposals.some((p) => p.risk === "medium")) return "medium";
  return "low";
}
