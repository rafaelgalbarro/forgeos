/** ForgeOS RC11 — Permissions matrix engine. */

import { getPermissionsForRole, listRoles, roleHasPermission } from "./rbac-engine";
import type { EnterprisePermission, EnterpriseRole } from "./types";

export interface PermissionMatrixRow {
  permission: EnterprisePermission;
  label: string;
  roles: Record<EnterpriseRole, boolean>;
}

const PERMISSION_LABELS: Record<EnterprisePermission, string> = {
  "org:read": "Ver organización",
  "org:write": "Editar organización",
  "team:read": "Ver equipos",
  "team:write": "Gestionar equipos",
  "users:read": "Ver usuarios",
  "users:write": "Gestionar usuarios",
  "billing:read": "Ver facturación",
  "billing:write": "Gestionar facturación",
  "usage:read": "Ver uso",
  "audit:read": "Ver auditoría",
  "api_keys:read": "Ver API keys",
  "api_keys:write": "Gestionar API keys",
  "webhooks:read": "Ver webhooks",
  "webhooks:write": "Gestionar webhooks",
  "security:read": "Ver seguridad",
  "security:write": "Gestionar seguridad",
  "compliance:read": "Ver cumplimiento",
};

export function buildPermissionMatrix(): PermissionMatrixRow[] {
  const roles = listRoles().map((r) => r.role);

  return (Object.keys(PERMISSION_LABELS) as EnterprisePermission[]).map((permission) => ({
    permission,
    label: PERMISSION_LABELS[permission],
    roles: Object.fromEntries(
      roles.map((role) => [role, roleHasPermission(role, permission)])
    ) as Record<EnterpriseRole, boolean>,
  }));
}

export function checkPermission(role: EnterpriseRole, permission: EnterprisePermission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export { PERMISSION_LABELS };
