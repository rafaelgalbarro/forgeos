/** Program 2035 — Quality review aggregation. */

import { assessCodeHealth, getCodeHealthScore } from "./code-health";
import { reviewDependencies } from "./dependency-review";
import { reviewArchitecture } from "./architecture-review";

export interface QualityReport {
  codeHealthScore: number;
  metrics: ReturnType<typeof assessCodeHealth>;
  dependencyIssues: ReturnType<typeof reviewDependencies>;
  archFindings: ReturnType<typeof reviewArchitecture>;
  overallScore: number;
}

export function runQualityReview(): QualityReport {
  const metrics = assessCodeHealth();
  const codeHealthScore = getCodeHealthScore(metrics);
  const dependencyIssues = reviewDependencies();
  const archFindings = reviewArchitecture();
  const depPenalty = dependencyIssues.length * 3;
  const archPenalty = archFindings.length * 4;
  const overallScore = Math.max(0, Math.round((codeHealthScore - depPenalty - archPenalty) / 1.2));

  return {
    codeHealthScore,
    metrics,
    dependencyIssues,
    archFindings,
    overallScore,
  };
}
