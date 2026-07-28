import type { SuccessDashboardData } from "./types";
import { getSuccessDashboardData } from "@/lib/design-partners/success-dashboard";

export function getRetentionMetrics(): SuccessDashboardData["retention"] {
  return getSuccessDashboardData().retention;
}

export function computeRetentionRate(returning: number, cohort: number): number {
  const denom = Math.max(cohort, 1);
  return Math.round((returning / denom) * 100);
}
