/** Program 4500 — Admin panel structure generator. */

import type { AdminPanel } from "./types";

export function generateAdminPanel(name: string): AdminPanel {
  return {
    sections: [
      { id: "overview", title: "Resumen", route: "/admin", permissions: ["admin:read"] },
      { id: "users", title: "Usuarios", route: "/admin/users", permissions: ["admin:users:read", "admin:users:write"] },
      { id: "roles", title: "Roles y permisos", route: "/admin/roles", permissions: ["admin:roles:read"] },
      { id: "audit", title: "Auditoría", route: "/admin/audit", permissions: ["admin:audit:read"] },
      { id: "settings", title: "Configuración", route: "/admin/settings", permissions: ["admin:settings:write"] },
    ],
    widgets: ["UserCount", "ActiveSessions", "RecentAuditEvents", "SystemHealth"],
    auditLog: true,
  };
}

export function formatAdminSummary(admin: AdminPanel): string {
  return `${admin.sections.length} secciones · ${admin.widgets.length} widgets`;
}
