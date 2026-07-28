/** ForgeOS Skills Framework — validator (RC4). */

import { getSkillById } from "./registry";
import type { SkillContext, SkillRequest } from "./types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateSkillRequest(request: SkillRequest): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!request.skillId?.trim()) errors.push("skillId is required");
  if (!request.context?.ventureId) errors.push("ventureId is required");
  if (!request.context?.requestedBy) errors.push("requestedBy department is required");
  if (!request.context?.action?.trim()) errors.push("action is required");

  const skill = getSkillById(request.skillId);
  if (!skill) {
    errors.push(`Unknown skill: ${request.skillId}`);
  } else {
    if (skill.status === "disabled") errors.push(`Skill ${skill.id} is disabled`);
    if (skill.health === "unavailable") warnings.push(`Skill ${skill.id} health is unavailable`);
    if (skill.requiredCredentials.length > 0) {
      warnings.push(`Credentials required: ${skill.requiredCredentials.join(", ")} (sandbox — not checked)`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function validateSkillContext(context: SkillContext): ValidationResult {
  return validateSkillRequest({ skillId: "validate", context });
}
