/** ForgeOS Capability Layer — permissions (RC4.9). */

import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { CapabilityDefinition } from "./types";
import { getCapabilityPolicy, isDepartmentAuthorized } from "./capability-policies";

export interface CapabilityPermissionResult {
  allowed: boolean;
  violations: string[];
  requiredApprovers: MeshDepartmentId[];
}

export function checkCapabilityPermission(
  capability: CapabilityDefinition,
  requestedBy: MeshDepartmentId
): CapabilityPermissionResult {
  const policy = getCapabilityPolicy(capability);
  const violations: string[] = [];

  if (!capability.authorizedDepartments.includes(requestedBy)) {
    violations.push(
      `Department ${requestedBy} not in authorized list for ${capability.id}`
    );
  }

  if (!isDepartmentAuthorized(requestedBy, policy)) {
    violations.push(`Department ${requestedBy} blocked by policy ${policy.id}`);
  }

  if (capability.status === "disabled") {
    violations.push(`Capability ${capability.id} is disabled`);
  }

  if (capability.health === "unavailable") {
    violations.push(`Capability ${capability.id} is unavailable`);
  }

  const requiredApprovers: MeshDepartmentId[] = policy.requireApproval
    ? ["ceo", ...(capability.risk === "critical" ? (["legal"] as MeshDepartmentId[]) : [])]
    : [];

  return {
    allowed: violations.length === 0,
    violations,
    requiredApprovers,
  };
}
