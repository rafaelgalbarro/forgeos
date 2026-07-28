/** ForgeOS Skills Framework — policies (RC4). */

import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { SkillCategory, SkillPolicy } from "./types";

const DEFAULT_POLICY: Omit<SkillPolicy, "id"> = {
  maxCostPerCall: 0.5,
  timeoutMs: 30_000,
  requireApproval: false,
  allowedDepartments: ["ceo", "cto", "cpo", "coo", "deployment"],
  sandboxOnly: true,
};

const CATEGORY_POLICIES: Partial<Record<SkillCategory, Partial<SkillPolicy>>> = {
  ai: { maxCostPerCall: 0.25, timeoutMs: 60_000, requireApproval: true },
  payments: { maxCostPerCall: 0.1, requireApproval: true, allowedDepartments: ["ceo", "cfo", "finance"] },
  cloud: { requireApproval: true, allowedDepartments: ["ceo", "cto", "infrastructure", "deployment"] },
  legal: { requireApproval: true, allowedDepartments: ["ceo", "legal"] },
  marketing: { allowedDepartments: ["ceo", "cmo", "growth"] },
  analytics: { allowedDepartments: ["ceo", "cpo", "coo", "growth", "cto"], sandboxOnly: true },
  productivity: {
    sandboxOnly: true,
    allowedDepartments: ["ceo", "cto", "cpo", "coo"],
  },
};

export function getSkillPolicy(category: SkillCategory): SkillPolicy {
  const override = CATEGORY_POLICIES[category] ?? {};
  return {
    id: `policy-${category}`,
    ...DEFAULT_POLICY,
    ...override,
    allowedDepartments: override.allowedDepartments ?? DEFAULT_POLICY.allowedDepartments,
  };
}

export function isDepartmentAllowed(
  department: MeshDepartmentId,
  policy: SkillPolicy
): boolean {
  return policy.allowedDepartments.includes(department);
}
