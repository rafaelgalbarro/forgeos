/** ForgeOS Skills Governance — Security Engine (RC4.1). */

import { getSkillById } from "@/lib/skills/registry";
import type { SandboxMode } from "./types";

export interface SecurityCheckResult {
  passed: boolean;
  violations: string[];
  warnings: string[];
  securityScore: number;
}

const BLOCKED_PATTERNS = [
  /api[_-]?key/i,
  /password/i,
  /secret/i,
  /private[_-]?key/i,
  /token.*=.*[a-zA-Z0-9]{20,}/,
];

export function runGovernanceSecurityCheck(params: {
  skillId: string;
  action: string;
  payload?: Record<string, unknown>;
  sandboxMode: SandboxMode;
}): SecurityCheckResult {
  const skill = getSkillById(params.skillId);
  const violations: string[] = [];
  const warnings: string[] = [];
  let securityScore = 100;

  if (!skill) {
    violations.push(`Unknown skill: ${params.skillId}`);
    return { passed: false, violations, warnings, securityScore: 0 };
  }

  if (skill.status === "disabled") {
    violations.push("Skill is disabled");
    securityScore -= 50;
  }

  if (params.sandboxMode === "production") {
    violations.push("Production mode blocked in RC4.1");
    securityScore -= 40;
  }

  if (skill.risks.includes("financial") && !/read|list|get/i.test(params.action)) {
    warnings.push("Financial skill — enhanced monitoring active");
    securityScore -= 10;
  }

  const payloadStr = JSON.stringify(params.payload ?? {});
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(payloadStr)) {
      violations.push("Potential credential leak in payload");
      securityScore -= 30;
      break;
    }
  }

  if (/delete|drop|destroy|purge/i.test(params.action) && skill.risks.includes("cloud_cost")) {
    warnings.push("Destructive cloud action — rollback plan required");
    securityScore -= 15;
  }

  return {
    passed: violations.length === 0,
    violations,
    warnings,
    securityScore: Math.max(0, securityScore),
  };
}

export interface SecurityEvent {
  id: string;
  timestamp: string;
  skillId: string;
  action: string;
  type: "violation" | "warning" | "scan";
  message: string;
  score: number;
}

export function scanRecentSecurityEvents(): SecurityEvent[] {
  const samples = [
    { skillId: "aws", action: "delete_database", type: "violation" as const, message: "Production mode blocked" },
    { skillId: "stripe", action: "charge_customer", type: "warning" as const, message: "Financial skill monitoring" },
    { skillId: "github", action: "read_repository", type: "scan" as const, message: "Routine security scan passed" },
  ];
  return samples.map((s, i) => ({
    id: `sec-${i}`,
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
    skillId: s.skillId,
    action: s.action,
    type: s.type,
    message: s.message,
    score: s.type === "violation" ? 40 : s.type === "warning" ? 75 : 95,
  }));
}
