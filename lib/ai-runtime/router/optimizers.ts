/** ForgeOS AI Runtime — routing optimizers. */

import type { OptimizerMode } from "../types";

export interface OptimizerWeights {
  cost: number;
  latency: number;
  quality: number;
  availability: number;
}

export function getOptimizerWeights(mode: OptimizerMode): OptimizerWeights {
  switch (mode) {
    case "cost":
      return { cost: 0.55, latency: 0.15, quality: 0.2, availability: 0.1 };
    case "latency":
      return { cost: 0.1, latency: 0.55, quality: 0.25, availability: 0.1 };
    case "quality":
      return { cost: 0.1, latency: 0.15, quality: 0.6, availability: 0.15 };
    default:
      return { cost: 0.25, latency: 0.25, quality: 0.35, availability: 0.15 };
  }
}

export function estimateBudgetRemaining(budgetUsd?: number): number {
  if (budgetUsd !== undefined && Number.isFinite(budgetUsd)) return budgetUsd;
  const budget = Number(process.env.AI_MONTHLY_BUDGET_USD ?? "100");
  return Number.isFinite(budget) ? budget : 100;
}
