/** ForgeOS RC11 — RBAC role definitions. */

import type { EnterprisePermission, EnterpriseRole, RoleDefinition } from "./types";

const ALL_PERMISSIONS: EnterprisePermission[] = [
  "org:read", "org:write",
  "team:read", "team:write",
  "users:read", "users:write",
  "billing:read", "billing:write",
  "usage:read", "audit:read",
  "api_keys:read", "api_keys:write",
  "webhooks:read", "webhooks:write",
  "security:read", "security:write",
  "compliance:read",
];

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  { role: "owner", label: "Propietario", permissions: [...ALL_PERMISSIONS] },
  {
    role: "admin",
    label: "Administrador",
    permissions: ALL_PERMISSIONS.filter((p) => p !== "billing:write"),
  },
  {
    role: "manager",
    label: "Manager",
    permissions: [
      "org:read", "team:read", "team:write",
      "users:read", "usage:read", "audit:read",
    ],
  },
  {
    role: "member",
    label: "Miembro",
    permissions: ["org:read", "team:read", "users:read", "usage:read"],
  },
  {
    role: "viewer",
    label: "Lector",
    permissions: ["org:read", "team:read", "usage:read"],
  },
];

export function getRoleDefinition(role: EnterpriseRole): RoleDefinition {
  return ROLE_DEFINITIONS.find((r) => r.role === role) ?? ROLE_DEFINITIONS[4];
}

export function getPermissionsForRole(role: EnterpriseRole): EnterprisePermission[] {
  return getRoleDefinition(role).permissions;
}

export function roleHasPermission(role: EnterpriseRole, permission: EnterprisePermission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function listRoles(): RoleDefinition[] {
  return ROLE_DEFINITIONS;
}
