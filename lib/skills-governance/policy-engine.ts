/** ForgeOS Skills Governance — Policy Engine (RC4.1). */

import { getSkillById } from "@/lib/skills/registry";
import type { PolicyEvaluation, PolicyEvaluationResult, PolicyKind, SandboxMode } from "./types";

function evaluatePolicy(
  kind: PolicyKind,
  skillId: string,
  action: string,
  sandboxMode: SandboxMode
): PolicyEvaluation {
  const skill = getSkillById(skillId);
  const violations: string[] = [];
  const constraints: string[] = [];

  switch (kind) {
    case "cost":
      if ((skill?.estimatedCostPerCall ?? 0) > 0.1) {
        constraints.push("Cost cap: $0.10 per call");
      }
      break;
    case "security":
      if (sandboxMode === "production") violations.push("Production mode blocked in RC4.1");
      if (skill?.risks.includes("financial")) constraints.push("Financial ops require dual approval");
      break;
    case "privacy":
      if (/pii|personal|customer_data/i.test(action)) {
        constraints.push("PII handling — privacy review required");
      }
      break;
    case "execution":
      if (skill?.status === "disabled") violations.push("Skill is disabled");
      constraints.push("Max timeout: 30s");
      break;
    case "compliance":
      if (skill?.category === "legal") constraints.push("Legal compliance check");
      break;
    case "ai_usage":
      if (skill?.category === "ai") constraints.push("Routed via AI Runtime only");
      break;
    case "tool":
      constraints.push("External tool access via Skills only");
      break;
    case "organization":
      constraints.push("Organization policy: sandbox default");
      break;
  }

  return { policy: kind, passed: violations.length === 0, violations, constraints };
}

const ALL_POLICIES: PolicyKind[] = [
  "cost",
  "security",
  "privacy",
  "execution",
  "compliance",
  "ai_usage",
  "tool",
  "organization",
];

export function evaluateAllPolicies(
  skillId: string,
  action: string,
  sandboxMode: SandboxMode
): PolicyEvaluationResult {
  const evaluations = ALL_POLICIES.map((p) => evaluatePolicy(p, skillId, action, sandboxMode));
  const failed = evaluations.find((e) => !e.passed);
  return {
    passed: !failed,
    evaluations,
    blockedBy: failed?.policy,
  };
}

export function listPolicyKinds(): PolicyKind[] {
  return [...ALL_POLICIES];
}
