import type { CEOApprovalGate, CEODecisionType, CEOMode } from "../../domain/venture-ceo";

const APPROVAL_REQUIRED_TYPES = new Set<CEODecisionType>([
  "CLOSE",
  "PIVOT",
  "MERGE",
  "LAUNCH",
  "ALLOCATE_RESOURCES",
  "RELEASE_RESOURCES",
  "REQUEST_HUMAN_REVIEW",
]);

const AUTONOMOUS_SAFE_ALLOWLIST = new Set<CEODecisionType>([
  "REDUCE_SCOPE",
  "VALIDATE_BEFORE_BUILD",
  "START_EXPERIMENT",
  "REUSE_ASSET",
  "RESOLVE_DEPENDENCY",
  "DELAY_LAUNCH",
]);

export function getCEOApprovalGate(decisionType: CEODecisionType): CEOApprovalGate {
  const requiresApproval = APPROVAL_REQUIRED_TYPES.has(decisionType);
  return {
    decisionType,
    requiresApproval,
    reason: requiresApproval
      ? "High-impact or irreversible portfolio action"
      : "Reversible operational recommendation",
  };
}

export function canExecuteInMode(mode: CEOMode, decisionType: CEODecisionType): { allowed: boolean; reason: string } {
  if (mode === "ADVISORY") {
    return { allowed: false, reason: "ADVISORY mode never executes actions" };
  }
  if (mode === "SUPERVISED") {
    return {
      allowed: !APPROVAL_REQUIRED_TYPES.has(decisionType),
      reason: APPROVAL_REQUIRED_TYPES.has(decisionType)
        ? "SUPERVISED requires explicit human approval"
        : "SUPERVISED allows reversible actions",
    };
  }
  return {
    allowed: AUTONOMOUS_SAFE_ALLOWLIST.has(decisionType),
    reason: AUTONOMOUS_SAFE_ALLOWLIST.has(decisionType)
      ? "AUTONOMOUS_SAFE allowlist action"
      : "AUTONOMOUS_SAFE blocks non-allowlisted action",
  };
}

