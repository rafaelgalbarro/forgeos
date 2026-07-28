/** ForgeOS Skills Framework — Skill Router (RC4). */

import { getSkillById } from "./registry";
import { getSkillPolicy } from "./policies";
import type { SkillRequest, SkillRoutingDecision } from "./types";

export function routeSkill(request: SkillRequest): SkillRoutingDecision {
  const skill = getSkillById(request.skillId);
  if (!skill) {
    return {
      skillId: request.skillId,
      provider: "unknown",
      policy: "deny",
      timeoutMs: 5000,
      auditLevel: "full",
      rationale: `Skill ${request.skillId} not found in registry`,
    };
  }

  const policy = getSkillPolicy(skill.category);
  const provider = request.preferredProvider ?? skill.provider;
  const fallbackMap: Record<string, string> = {
    github: "gitlab",
    gitlab: "bitbucket",
    vercel: "netlify",
    "openai-skill": "claude-skill",
    "claude-skill": "gemini-skill",
  };

  return {
    skillId: skill.id,
    provider,
    policy: policy.id,
    timeoutMs: policy.timeoutMs,
    fallbackSkillId: fallbackMap[skill.id],
    auditLevel: policy.requireApproval ? "full" : "standard",
    rationale: [
      `Routed ${skill.name} (${skill.category})`,
      `Provider: ${provider}`,
      `Policy: ${policy.id}`,
      `Timeout: ${policy.timeoutMs}ms`,
      policy.sandboxOnly ? "Sandbox mode — no real external calls" : "",
    ]
      .filter(Boolean)
      .join(". "),
  };
}
