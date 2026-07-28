/** ForgeOS Capability Layer — policies (RC4.9). */

import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { CapabilityCategory, CapabilityDefinition, CapabilityPolicy } from "./types";

const DEFAULT_POLICY: Omit<CapabilityPolicy, "id"> = {
  maxCostPerCall: 0.5,
  timeoutMs: 30_000,
  requireApproval: false,
  allowedDepartments: ["ceo", "cto", "cpo", "coo", "deployment"],
  sandboxOnly: true,
  auditLevel: "standard",
};

const CATEGORY_POLICIES: Partial<
  Record<CapabilityCategory, Partial<CapabilityPolicy>>
> = {
  development: {
    requireApproval: true,
    allowedDepartments: ["ceo", "cto", "deployment", "infrastructure", "backend", "frontend"],
    auditLevel: "full",
  },
  business: {
    requireApproval: true,
    maxCostPerCall: 0.2,
    allowedDepartments: ["ceo", "cfo", "finance", "legal", "sales"],
    auditLevel: "full",
  },
  marketing: {
    allowedDepartments: ["ceo", "cmo", "growth"],
    requireApproval: true,
  },
  venture: {
    maxCostPerCall: 1.0,
    timeoutMs: 120_000,
    requireApproval: true,
    auditLevel: "full",
  },
};

const HIGH_RISK_CAPABILITIES = new Set([
  "deploy_software",
  "create_infrastructure",
  "sign_contract",
  "publish_release",
  "publish_campaign",
]);

export function getCapabilityPolicy(
  capability: CapabilityDefinition
): CapabilityPolicy {
  const categoryOverride = CATEGORY_POLICIES[capability.category] ?? {};
  const highRisk = HIGH_RISK_CAPABILITIES.has(capability.id);

  return {
    id: `cap-policy-${capability.category}-${capability.id}`,
    ...DEFAULT_POLICY,
    ...categoryOverride,
    requireApproval:
      highRisk ||
      capability.risk === "critical" ||
      capability.risk === "high" ||
      (categoryOverride.requireApproval ?? DEFAULT_POLICY.requireApproval),
    allowedDepartments:
      categoryOverride.allowedDepartments ?? DEFAULT_POLICY.allowedDepartments,
    sandboxOnly: true,
    auditLevel: highRisk ? "full" : (categoryOverride.auditLevel ?? DEFAULT_POLICY.auditLevel),
  };
}

export function isDepartmentAuthorized(
  department: MeshDepartmentId,
  policy: CapabilityPolicy
): boolean {
  return policy.allowedDepartments.includes(department);
}
