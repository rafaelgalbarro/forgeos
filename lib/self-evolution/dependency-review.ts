/** Program 2035 — Dependency review heuristics. */

export interface DependencyIssue {
  id: string;
  package: string;
  issue: "outdated" | "unused" | "duplicate" | "vulnerability";
  current?: string;
  latest?: string;
  severity: "low" | "medium" | "high";
}

const ISSUES: DependencyIssue[] = [
  { id: "dep-next", package: "next", issue: "outdated", current: "15.1.0", latest: "15.2.0", severity: "low" },
  { id: "dep-lodash", package: "lodash", issue: "unused", severity: "medium" },
  { id: "dep-react", package: "react-dom", issue: "duplicate", severity: "low" },
  { id: "dep-demo-cve", package: "demo-pkg", issue: "vulnerability", severity: "low" },
];

export function reviewDependencies(): DependencyIssue[] {
  return [...ISSUES];
}

export function getDependencyHealthScore(issues: DependencyIssue[]): number {
  const penalty = issues.length * 5;
  return Math.max(0, 100 - penalty);
}
