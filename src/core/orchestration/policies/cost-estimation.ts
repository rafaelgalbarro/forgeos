/** PROGRAM 6030 — Cost / time estimation (never present estimates as actual). */

import type { CostEstimate, DurationEstimate } from "../../domain/types";
import type { MissionExecutionPlan, WorkflowNode } from "../types";

export function createEstimate(
  amount: number,
  unit: CostEstimate["unit"],
  source: string,
  confidence = 0.5,
  assumptions: string[] = ["Model estimate only"],
): CostEstimate {
  return { amount, unit, confidence, assumptions, source, kind: "estimated" };
}

export function createDurationEstimate(
  amount: number,
  unit: DurationEstimate["unit"],
  source: string,
  confidence = 0.5,
  assumptions: string[] = ["Timing model estimate only"],
): DurationEstimate {
  return { amount, unit, confidence, assumptions, source, kind: "estimated" };
}

export function assertNotPresentedAsActual(estimate: CostEstimate | DurationEstimate): void {
  if (estimate.kind === "actual") return;
  if (!estimate.assumptions.length) {
    throw new Error("Estimated values must carry assumptions — never present as real data");
  }
}

export function recomputePlanEstimates(plan: MissionExecutionPlan): MissionExecutionPlan {
  const nodeCost = plan.nodes.reduce((sum, n) => sum + nodeCostWeight(n), 0);
  const nodeMinutes = plan.nodes.reduce((sum, n) => sum + nodeTimeWeight(n), 0);

  const estimatedCost = createEstimate(nodeCost, "EUR", "orchestration-estimator", 0.55, [
    "Sum of node cost weights",
    "Not billing data",
  ]);
  const estimatedDuration = createDurationEstimate(nodeMinutes, "min", "orchestration-estimator", 0.55, [
    "Sum of node duration weights",
    "Parallelism not fully subtracted",
  ]);

  assertNotPresentedAsActual(estimatedCost);
  assertNotPresentedAsActual(estimatedDuration);

  return { ...plan, estimatedCost, estimatedDuration, updatedAt: new Date().toISOString() };
}

function nodeCostWeight(node: WorkflowNode): number {
  switch (node.type) {
    case "GENERATE_CODEBASE":
    case "BUILD":
      return 2.5;
    case "DEPLOY":
    case "CREATE_PREVIEW":
      return 1.5;
    case "GENERATE_OUTPUT":
      return 1.2;
    default:
      return 0.4;
  }
}

function nodeTimeWeight(node: WorkflowNode): number {
  return Math.max(0.5, node.weight * 0.8);
}

export function formatEstimateLabel(estimate: CostEstimate | DurationEstimate): string {
  const tag = estimate.kind === "actual" ? "actual" : "estimated";
  return `${estimate.amount} ${estimate.unit} (${tag}, confidence ${Math.round(estimate.confidence * 100)}%)`;
}
