import type { SuccessDashboardData } from "./types";
import { getSuccessDashboardData } from "@/lib/design-partners/success-dashboard";

export function getActivationMetrics(): SuccessDashboardData["activation"] {
  return getSuccessDashboardData().activation;
}

export function computeActivationRate(completed: number, started: number): number {
  const denom = Math.max(started, 1);
  return Math.round((completed / denom) * 100);
}
