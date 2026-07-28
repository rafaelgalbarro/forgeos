/** ForgeOS Capability Layer — router (RC4.9). */

import { getCapabilityById } from "./capability-registry";
import { getCapabilityPolicy } from "./capability-policies";
import type { CapabilityDefinition, CapabilityRequest } from "./types";

export interface CapabilityRouteDecision {
  capabilityId: string;
  category: CapabilityDefinition["category"];
  policyId: string;
  priority: CapabilityDefinition["priority"];
  targetSkillPool: string[];
  targetProviderPool: string[];
  rationale: string;
}

export function routeCapability(request: CapabilityRequest): CapabilityRouteDecision {
  const capability = getCapabilityById(request.capabilityId);
  if (!capability) {
    return {
      capabilityId: request.capabilityId,
      category: "development",
      policyId: "deny",
      priority: "normal",
      targetSkillPool: [],
      targetProviderPool: [],
      rationale: `Capability ${request.capabilityId} not found`,
    };
  }

  const policy = getCapabilityPolicy(capability);

  return {
    capabilityId: capability.id,
    category: capability.category,
    policyId: policy.id,
    priority: capability.priority,
    targetSkillPool: capability.compatibleSkills,
    targetProviderPool: capability.compatibleProviders,
    rationale: [
      `Routed capability ${capability.name} (${capability.category})`,
      `Skills pool: ${capability.compatibleSkills.length}`,
      `Policy: ${policy.id}`,
      `Priority: ${capability.priority}`,
      policy.sandboxOnly ? "Sandbox mode enforced" : "",
    ]
      .filter(Boolean)
      .join(". "),
  };
}
