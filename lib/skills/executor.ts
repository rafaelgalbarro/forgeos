/** ForgeOS Skills Framework — executor (mock only, RC4). */

import { executeAICapabilitySkillMock, isAICapabilitySkill } from "./ai/executor-bridge";
import { executeBusinessSkillMock } from "./business";
import { executeMarketingSkillMock } from "./marketing/executor";
import { isMarketingSkill } from "./marketing/registry";
import { executeAnalyticsSkillMock } from "./analytics/executor-bridge";
import { isAnalyticsSkillId } from "./analytics/registry";
import { executeProductivitySkillMock, isProductivitySkill } from "./productivity/executor";
import { executeProviderSkillMock, isRc42ProviderSkill } from "./provider-router";
import { getSkillById } from "./registry";
import { runSkillSecurityCheck, recordSkillCall } from "./security";
import type {
  SkillContext,
  SkillExecutionPlan,
  SkillMockResult,
  SkillRoutingDecision,
} from "./types";

export function buildExecutionPlan(
  skillId: string,
  action: string,
  routing: SkillRoutingDecision
): SkillExecutionPlan {
  const skill = getSkillById(skillId);
  const name = skill?.name ?? skillId;

  return {
    steps: [
      `Validate permissions for ${name}`,
      `Resolve credentials (sandbox — skipped)`,
      `Route to provider: ${routing.provider}`,
      `Prepare ${action} request`,
      `[SANDBOX] Mock execute ${name}.${action}`,
      `Record audit log and telemetry`,
      `Dispatch result to Runtime`,
      `Update Memory and Decision Graph`,
    ],
    recoveryPlan: [
      `Retry with fallback: ${routing.fallbackSkillId ?? "none"}`,
      "Notify requesting department",
      "Escalate to CEO if repeated failure",
    ],
    rollbackSteps: [
      "Revert pending state changes",
      "Mark execution as rolled_back in audit",
      "Notify Security department",
    ],
    estimatedDurationMs: skill?.estimatedLatencyMs ?? 1000,
  };
}

export function executeSkillMock(
  skillId: string,
  context: SkillContext,
  routing: SkillRoutingDecision
): SkillMockResult {
  if (isMarketingSkill(skillId)) {
    return executeMarketingSkillMock(skillId, context, routing);
  }

  if (isAnalyticsSkillId(skillId)) {
    recordSkillCall();
    return executeAnalyticsSkillMock(skillId, context, routing)!;
  }

  if (isAICapabilitySkill(skillId)) {
    recordSkillCall();
    return executeAICapabilitySkillMock(skillId, context, routing)!;
  }

  if (isProductivitySkill(skillId)) {
    const result = executeProductivitySkillMock(skillId, context, routing);
    if (result) {
      recordSkillCall();
      return result;
    }
  }

  if (isRc42ProviderSkill(skillId)) {
    const skill = getSkillById(skillId);
    if (skill) {
      const security = runSkillSecurityCheck(skill, context);
      if (!security.passed) {
        return {
          success: false,
          output: `Security check failed: ${security.violations.join("; ")}`,
          mock: true,
        };
      }
    }
    recordSkillCall();
    const providerResult = executeProviderSkillMock(skillId, context);
    if (providerResult) return providerResult;
  }

  const skill = getSkillById(skillId);
  if (!skill) {
    return { success: false, output: `Skill ${skillId} not found`, mock: true };
  }

  const security = runSkillSecurityCheck(skill, context);
  if (!security.passed) {
    return {
      success: false,
      output: `Security check failed: ${security.violations.join("; ")}`,
      mock: true,
    };
  }

  recordSkillCall();

  const businessMock = executeBusinessSkillMock(skillId, context, routing);
  if (businessMock) return businessMock;

  return {
    success: true,
    output: `[MOCK] ${skill.name} executed "${context.action}" for venture ${context.ventureId} via ${routing.provider}`,
    data: {
      skillId,
      provider: routing.provider,
      action: context.action,
      sandbox: true,
      requestedBy: context.requestedBy,
    },
    mock: true,
  };
}
