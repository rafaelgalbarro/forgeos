/** ForgeOS Skills Governance Lab — RC4.1. */

import {
  getRiskMatrix,
  listDefaultPermissions,
  listPolicyKinds,
  evaluateAllPolicies,
  getApprovalQueue,
  getGovernanceAuditLog,
  listRollbackPlans,
  scanRecentSecurityEvents,
  listSandboxResults,
  runGovernedSkillRequest,
  getGovernanceHistory,
  getGovernanceEvents,
  getGovernanceTelemetry,
} from "@/lib/skills-governance";
import type { GovernanceResult } from "@/lib/skills-governance/types";

export interface SkillsGovernanceLabSnapshot {
  riskMatrix: ReturnType<typeof getRiskMatrix>;
  permissions: ReturnType<typeof listDefaultPermissions>;
  policyKinds: ReturnType<typeof listPolicyKinds>;
  policySample: ReturnType<typeof evaluateAllPolicies>;
  approvalQueue: ReturnType<typeof getApprovalQueue>;
  auditLog: ReturnType<typeof getGovernanceAuditLog>;
  rollbackPlans: ReturnType<typeof listRollbackPlans>;
  securityEvents: ReturnType<typeof scanRecentSecurityEvents>;
  sandboxResults: ReturnType<typeof listSandboxResults>;
  history: ReturnType<typeof getGovernanceHistory>;
  events: ReturnType<typeof getGovernanceEvents>;
  telemetry: ReturnType<typeof getGovernanceTelemetry>;
  sampleExecution: GovernanceResult | null;
}

export async function runSkillsGovernanceLab(
  ventureId = "demo-venture-vandl"
): Promise<SkillsGovernanceLabSnapshot> {
  let sampleExecution: GovernanceResult | null = null;
  try {
    sampleExecution = await runGovernedSkillRequest({
      skillId: "github",
      context: {
        ventureId,
        requestedBy: "cto",
        approvedBy: "ceo",
        action: "create_repository",
      },
    });
  } catch {
    sampleExecution = null;
  }

  return {
    riskMatrix: getRiskMatrix(),
    permissions: listDefaultPermissions(),
    policyKinds: listPolicyKinds(),
    policySample: evaluateAllPolicies("vercel", "deploy_production", "sandbox"),
    approvalQueue: getApprovalQueue(),
    auditLog: getGovernanceAuditLog(ventureId),
    rollbackPlans: listRollbackPlans(),
    securityEvents: scanRecentSecurityEvents(),
    sandboxResults: listSandboxResults(),
    history: getGovernanceHistory(ventureId),
    events: getGovernanceEvents(ventureId),
    telemetry: getGovernanceTelemetry(),
    sampleExecution,
  };
}
