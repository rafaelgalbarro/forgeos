/** ForgeOS Skills Governance — Approval Engine (RC4.1). */

import type { ApprovalDecision, ApprovalQueueItem, ApprovalType, RiskLevel } from "./types";
import { appendApprovalQueue, updateApprovalQueueItem } from "./governance-store";

const SKILL_APPROVAL_MAP: Record<string, ApprovalType> = {
  email: "founder",
  vercel: "dual",
  netlify: "dual",
  railway: "dual",
  aws: "board",
  azure: "board",
  gcp: "board",
  stripe: "dual",
  "business-payments": "dual",
  "business-contracts": "dual",
  "business-billing": "ceo",
};

function resolveApprovalType(skillId: string, riskLevel: RiskLevel, emergency?: boolean): ApprovalType {
  if (emergency) return "emergency";
  if (SKILL_APPROVAL_MAP[skillId]) return SKILL_APPROVAL_MAP[skillId]!;
  switch (riskLevel) {
    case "CRITICAL":
      return "board";
    case "HIGH":
      return "dual";
    case "MEDIUM":
      return "ceo";
    default:
      return "auto";
  }
}

function autoApprove(type: ApprovalType, requestedBy: string): ApprovalDecision {
  const approvers: Record<ApprovalType, string[]> = {
    auto: ["system"],
    founder: ["founder"],
    ceo: ["ceo"],
    board: ["ceo", "board"],
    dual: ["founder", "ceo"],
    emergency: ["ceo", "founder"],
  };

  return {
    type,
    approved: true,
    approvers: approvers[type],
    signature: `forgeos-gov-${type}-${Date.now()}`,
    approvalTimeMs: type === "auto" ? 5 : 120,
    rationale:
      type === "auto"
        ? "Low risk — auto approved"
        : `[SANDBOX] Simulated ${type} approval for RC4.1`,
  };
}

export function processApproval(params: {
  skillId: string;
  ventureId: string;
  requestedBy: string;
  action: string;
  riskLevel: RiskLevel;
  emergency?: boolean;
  preApprovedBy?: string;
}): ApprovalDecision {
  const started = Date.now();
  const type = resolveApprovalType(params.skillId, params.riskLevel, params.emergency);

  if (type !== "auto") {
    const item = appendApprovalQueue({
      skillId: params.skillId,
      ventureId: params.ventureId,
      requestedBy: params.requestedBy as ApprovalQueueItem["requestedBy"],
      action: params.action,
      riskLevel: params.riskLevel,
      approvalType: type,
      status: "pending",
    });
    updateApprovalQueueItem(item.id, "approved");
  }

  const decision = autoApprove(type, params.requestedBy);
  if (params.preApprovedBy) {
    decision.approvers.push(params.preApprovedBy);
    decision.rationale = `Pre-approved by ${params.preApprovedBy}`;
  }
  decision.approvalTimeMs = Date.now() - started;
  return decision;
}

export function getApprovalRequirements(skillId: string, riskLevel: RiskLevel): ApprovalType {
  return resolveApprovalType(skillId, riskLevel);
}
