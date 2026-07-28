/** Program 4500 — RBAC roles/permissions generator. */

import type { Permissions } from "./types";

export function generatePermissions(name: string): Permissions {
  const permissions = [
    { id: "items:read", name: "Leer items", description: "Ver listado y detalle de items" },
    { id: "items:write", name: "Escribir items", description: "Crear y editar items" },
    { id: "items:delete", name: "Eliminar items", description: "Eliminar items" },
    { id: "admin:read", name: "Acceso admin", description: "Ver panel de administración" },
    { id: "admin:users:read", name: "Ver usuarios", description: "Listar usuarios del sistema" },
    { id: "admin:users:write", name: "Gestionar usuarios", description: "Crear/editar usuarios" },
    { id: "admin:roles:read", name: "Ver roles", description: "Consultar roles y permisos" },
    { id: "admin:audit:read", name: "Ver auditoría", description: "Consultar log de auditoría" },
    { id: "admin:settings:write", name: "Configuración", description: "Modificar configuración del sistema" },
  ];

  return {
    permissions,
    roles: [
      { id: "viewer", name: "Visor", permissions: ["items:read"] },
      { id: "user", name: "Usuario", permissions: ["items:read", "items:write"] },
      { id: "admin", name: "Administrador", permissions: permissions.map((p) => p.id) },
    ],
    defaultRole: "user",
  };
}

export function formatPermissionsSummary(perms: Permissions): string {
  return `${perms.roles.length} roles · ${perms.permissions.length} permisos`;
}
