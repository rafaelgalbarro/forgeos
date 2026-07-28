/** ForgeOS Skills Governance — Permission Engine (RC4.1). */

import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { GovernancePermission, PermissionEffect } from "./types";

export interface PermissionCheckResult {
  allowed: boolean;
  effect: PermissionEffect;
  matchedPermissions: GovernancePermission[];
  reason: string;
}

const DEFAULT_PERMISSIONS: GovernancePermission[] = [
  { id: "p-founder-all", actorType: "founder", actorId: "founder", effect: "allow", scopes: ["*"] },
  { id: "p-ceo-exec", actorType: "ceo", actorId: "ceo", effect: "allow", scopes: ["skill:execute", "skill:approve"] },
  { id: "p-cto-dev", actorType: "department", actorId: "cto", effect: "allow", scopes: ["development:*", "cicd:*", "cloud:read"] },
  { id: "p-cfo-finance", actorType: "department", actorId: "cfo", effect: "allow", scopes: ["finance:*", "payments:read"] },
  { id: "p-legal-legal", actorType: "department", actorId: "legal", effect: "allow", scopes: ["legal:*"] },
  { id: "p-worker-restricted", actorType: "worker", actorId: "research-worker", effect: "restrict", scopes: ["documents:read", "knowledge:read"] },
];

export function checkGovernancePermission(params: {
  actorType: GovernancePermission["actorType"];
  actorId: string;
  skillId: string;
  provider: string;
  workspaceId: string;
  action: string;
}): PermissionCheckResult {
  const matched = DEFAULT_PERMISSIONS.filter((p) => {
    if (p.actorType !== params.actorType && p.actorType !== "organization") return false;
    if (p.actorId !== params.actorId && p.actorId !== "*") return false;
    if (p.skillId && p.skillId !== params.skillId) return false;
    if (p.provider && p.provider !== params.provider) return false;
    if (p.workspaceId && p.workspaceId !== params.workspaceId) return false;
    if (p.expiresAt && new Date(p.expiresAt) < new Date()) return false;
    return true;
  });

  const deny = matched.find((p) => p.effect === "deny");
  if (deny) {
    return { allowed: false, effect: "deny", matchedPermissions: matched, reason: "Explicit deny rule" };
  }

  const allow = matched.find((p) => p.effect === "allow" || p.effect === "delegate");
  if (allow || params.actorType === "founder") {
    return {
      allowed: true,
      effect: allow?.effect ?? "allow",
      matchedPermissions: matched,
      reason: params.actorType === "founder" ? "Founder override" : "Permission granted",
    };
  }

  const deptAllow = DEFAULT_PERMISSIONS.some(
    (p) => p.actorId === params.actorId && (p.effect === "allow" || p.effect === "restrict")
  );
  if (deptAllow) {
    return { allowed: true, effect: "restrict", matchedPermissions: matched, reason: "Department scoped access" };
  }

  return { allowed: false, effect: "deny", matchedPermissions: [], reason: "No matching permission" };
}

export function checkDepartmentPermission(
  department: MeshDepartmentId,
  skillId: string,
  provider: string,
  workspaceId: string,
  action: string
): PermissionCheckResult {
  return checkGovernancePermission({
    actorType: "department",
    actorId: department,
    skillId,
    provider,
    workspaceId,
    action,
  });
}

export function listDefaultPermissions(): GovernancePermission[] {
  return [...DEFAULT_PERMISSIONS];
}
