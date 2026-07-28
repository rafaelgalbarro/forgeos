/** PROGRAM 6030 — Concurrency / cost limit helpers. */

import type { ConcurrencyLimits, PlanPolicyBundle } from "../types";

export function limitsFromPolicies(policies: PlanPolicyBundle): ConcurrencyLimits {
  return {
    maxConcurrency: policies.maxConcurrency,
    maxWorkspaceCount: policies.maxWorkspaceCount,
    maxProviderCalls: policies.maxProviderCalls,
    maxEstimatedCostAmount: policies.maxEstimatedCost.amount,
  };
}

export function assertWithinCostCap(
  estimatedAmount: number,
  limits: ConcurrencyLimits,
): boolean {
  return estimatedAmount <= limits.maxEstimatedCostAmount;
}
