/** ForgeOS Venture State Machine — heuristic guards (Epic 4.2). */

import type { GuardResult, VentureState, VentureStateContext } from "./types";

function allowed(reason: string, warnings: string[] = []): GuardResult {
  return { allowed: true, reason, missingRequirements: [], warnings };
}

function blocked(
  reason: string,
  missingRequirements: string[],
  warnings: string[] = [],
): GuardResult {
  return { allowed: false, reason, missingRequirements, warnings };
}

function hasDiscoveryContent(context: VentureStateContext): boolean {
  if (context.discoveryComplete === true) return true;
  return (context.discoveryArtifacts?.length ?? 0) > 0;
}

/** Evaluate heuristic guards for a specific target state. */
export function evaluateGuard(
  from: VentureState,
  to: VentureState,
  context: VentureStateContext,
  resumeState: VentureState | null,
): GuardResult {
  const warnings: string[] = [];

  if (from === "BLOCKED" && to !== "ARCHIVED") {
    if (!context.blockResolved) {
      return blocked("Block must be resolved before resuming.", [
        "blockResolved",
      ]);
    }
    if (resumeState && to === resumeState) {
      return allowed("Block resolved; resuming to previous state.", warnings);
    }
  }

  if (from === "PAUSED" && resumeState && to === resumeState) {
    return allowed("Resuming from paused state.", warnings);
  }

  if (to === "RESEARCH") {
    if (!hasDiscoveryContent(context)) {
      return blocked("Discovery must have content before starting research.", [
        "discoveryComplete or discoveryArtifacts",
      ]);
    }
  }

  if (to === "PRODUCT") {
    if (context.researchComplete !== true) {
      return blocked("Research must be complete before product definition.", [
        "researchComplete",
      ]);
    }
  }

  if (to === "BUILD") {
    if (context.hasProductPrd !== true) {
      return blocked("Product PRD is required before build.", ["hasProductPrd"]);
    }
  }

  if (to === "LAUNCH") {
    if (context.qaComplete !== true) {
      return blocked("QA must be completed before launch.", ["qaComplete"]);
    }
  }

  if (to === "CAPITAL") {
    if (context.hasMinimumMetrics !== true) {
      const metricKeys = context.metrics ? Object.keys(context.metrics) : [];
      return blocked("Minimum metrics threshold not met for capital stage.", [
        "hasMinimumMetrics",
        ...(metricKeys.length === 0 ? ["metrics (mrr, users, or revenue)"] : []),
      ]);
    }
    if (context.metrics) {
      const mrr = context.metrics.mrr ?? 0;
      if (mrr > 0 && mrr < 1000) {
        warnings.push("MRR below typical seed threshold; capital readiness may be limited.");
      }
    }
  }

  if (to === "BLOCKED") {
    warnings.push("Venture will be blocked; ensure block reason is documented.");
  }

  if (to === "PAUSED") {
    warnings.push("Venture will be paused; downstream scheduler tasks may stall.");
  }

  if (to === "ARCHIVED") {
    warnings.push("Archiving is terminal for active pipeline work.");
  }

  return allowed(`Transition from ${from} to ${to} permitted.`, warnings);
}
