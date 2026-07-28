/** ForgeOS Skills Framework — permissions & scopes (RC4). */

import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { SkillDefinition } from "./types";
import { getSkillPolicy, isDepartmentAllowed } from "./policies";

export interface PermissionCheck {
  allowed: boolean;
  scopes: string[];
  reason: string;
}

export function checkSkillPermission(
  skill: SkillDefinition,
  department: MeshDepartmentId,
  action: string
): PermissionCheck {
  const policy = getSkillPolicy(skill.category);
  const scopes = [...skill.permissions, `${skill.category}:${action}`];

  if (!isDepartmentAllowed(department, policy)) {
    return {
      allowed: false,
      scopes,
      reason: `Department ${department} not allowed for ${skill.category} skills`,
    };
  }

  if (policy.requireApproval && department !== "ceo") {
    return {
      allowed: true,
      scopes,
      reason: "Allowed with CEO approval required",
    };
  }

  return { allowed: true, scopes, reason: "Permission granted" };
}

export function getRequiredScopes(skill: SkillDefinition): string[] {
  return [...skill.permissions, ...skill.requiredCredentials.map((c) => `credential:${c}`)];
}
