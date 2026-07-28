/** ForgeOS Skills Framework — security sandbox (RC4). */

import type { SkillDefinition, SkillContext } from "./types";
import { checkSkillPermission } from "./permissions";

export interface SecurityCheckResult {
  passed: boolean;
  sandbox: boolean;
  rateLimitOk: boolean;
  timeoutMs: number;
  auditRequired: boolean;
  rollbackEnabled: boolean;
  violations: string[];
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_CALLS_PER_WINDOW = 30;
const callTimestamps: number[] = [];

export function runSkillSecurityCheck(
  skill: SkillDefinition,
  context: SkillContext
): SecurityCheckResult {
  const violations: string[] = [];
  const perm = checkSkillPermission(skill, context.requestedBy, context.action);

  if (!perm.allowed) violations.push(perm.reason);

  const now = Date.now();
  while (callTimestamps.length > 0 && callTimestamps[0]! < now - RATE_LIMIT_WINDOW_MS) {
    callTimestamps.shift();
  }
  const rateLimitOk = callTimestamps.length < MAX_CALLS_PER_WINDOW;
  if (!rateLimitOk) violations.push("Rate limit exceeded");

  const highRisk = skill.risks.includes("financial") || skill.risks.includes("cloud_cost");
  const timeoutMs = highRisk ? 15_000 : 30_000;

  return {
    passed: violations.length === 0,
    sandbox: true,
    rateLimitOk,
    timeoutMs,
    auditRequired: true,
    rollbackEnabled: highRisk,
    violations,
  };
}

export function recordSkillCall(): void {
  callTimestamps.push(Date.now());
}
