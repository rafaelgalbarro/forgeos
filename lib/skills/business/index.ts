/** ForgeOS Business Skills — public API (RC4.4). */

export * from "./types";
export * from "./registry";

export * from "./crm";
export * from "./erp";
export * from "./accounting";
export * from "./payments";
export * from "./contracts";
export * from "./billing";
export * from "./invoices";
export * from "./customers";

import type { SkillContext, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";
import { isBusinessSkill } from "./registry";
import { mockExecuteCrm } from "./crm/mock-executor";
import { mockExecuteErp } from "./erp/mock-executor";
import { mockExecuteAccounting } from "./accounting/mock-executor";
import { mockExecutePayments } from "./payments/mock-executor";
import { mockExecuteContracts } from "./contracts/mock-executor";
import { mockExecuteBilling } from "./billing/mock-executor";
import { mockExecuteInvoices } from "./invoices/mock-executor";
import { mockExecuteCustomers } from "./customers/mock-executor";

const MOCK_EXECUTORS: Record<
  string,
  (context: SkillContext, routing: SkillRoutingDecision) => SkillMockResult
> = {
  "business-crm": mockExecuteCrm,
  "business-erp": mockExecuteErp,
  "business-accounting": mockExecuteAccounting,
  "business-payments": mockExecutePayments,
  "business-contracts": mockExecuteContracts,
  "business-billing": mockExecuteBilling,
  "business-invoices": mockExecuteInvoices,
  "business-customers": mockExecuteCustomers,
};

export function executeBusinessSkillMock(
  skillId: string,
  context: SkillContext,
  routing: SkillRoutingDecision
): SkillMockResult | null {
  if (!isBusinessSkill(skillId)) return null;
  const executor = MOCK_EXECUTORS[skillId];
  if (!executor) return null;
  return executor(context, routing);
}

export async function runBusinessSkillViaGovernance(
  skillId: string,
  context: SkillContext
): Promise<import("@/lib/skills-governance/types").GovernanceResult> {
  const { runGovernedSkillRequest } = await import("@/lib/skills-governance/pipeline");
  return runGovernedSkillRequest({ skillId, context });
}
