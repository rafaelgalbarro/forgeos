/** ForgeOS Skills Governance — Execution Guard (RC4.1). */

import { getSkillById } from "@/lib/skills/registry";
import { checkRateLimit } from "./rate-limiter";
import { resolveSandboxMode } from "./sandbox-manager";
import { runGovernanceSecurityCheck } from "./security-engine";
import type { GovernanceRequest, RiskAssessment, SandboxMode } from "./types";

export interface ExecutionGuardResult {
  allowed: boolean;
  sandboxMode: SandboxMode;
  reason?: string;
  securityScore: number;
  rateLimitRemaining: number;
}

export function guardExecution(
  request: GovernanceRequest,
  risk: RiskAssessment
): ExecutionGuardResult {
  const sandboxMode = resolveSandboxMode(request.sandboxMode, risk.sandboxMode);
  const skill = getSkillById(request.skillId);

  if (!skill) {
    return {
      allowed: false,
      sandboxMode,
      reason: `Skill ${request.skillId} not found`,
      securityScore: 0,
      rateLimitRemaining: 0,
    };
  }

  if (skill.status === "disabled") {
    return {
      allowed: false,
      sandboxMode,
      reason: "Skill is disabled",
      securityScore: 0,
      rateLimitRemaining: 0,
    };
  }

  const rateCheck = checkRateLimit(request.skillId, request.context.ventureId);
  if (!rateCheck.allowed) {
    return {
      allowed: false,
      sandboxMode,
      reason: rateCheck.reason,
      securityScore: 100,
      rateLimitRemaining: rateCheck.remaining,
    };
  }

  const security = runGovernanceSecurityCheck({
    skillId: request.skillId,
    action: request.context.action,
    payload: request.context.payload,
    sandboxMode,
  });

  if (!security.passed) {
    return {
      allowed: false,
      sandboxMode,
      reason: security.violations.join("; "),
      securityScore: security.securityScore,
      rateLimitRemaining: rateCheck.remaining,
    };
  }

  return {
    allowed: true,
    sandboxMode,
    securityScore: security.securityScore,
    rateLimitRemaining: rateCheck.remaining,
  };
}
