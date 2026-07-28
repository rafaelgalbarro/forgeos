/** Program 4500 — Backend modules/services generator. */

import type { BackendModules, DatabaseSchema } from "./types";

export function generateBackendModules(name: string, schema: DatabaseSchema): BackendModules {
  const entity = schema.tables.find((t) => !["profiles", "audit_log"].includes(t.name))?.name ?? "items";

  return {
    runtime: "nextjs-api",
    modules: [
      {
        name: "AuthService",
        path: "lib/services/auth.ts",
        description: "Autenticación y sesiones Supabase",
        services: ["login", "logout", "refreshSession", "getCurrentUser"],
      },
      {
        name: "EntityService",
        path: `lib/services/${entity}.ts`,
        description: `CRUD de ${entity}`,
        services: ["list", "getById", "create", "update", "delete"],
      },
      {
        name: "DashboardService",
        path: "lib/services/dashboard.ts",
        description: "Agregaciones y métricas",
        services: ["getStats", "getRecentActivity"],
      },
      {
        name: "AdminService",
        path: "lib/services/admin.ts",
        description: "Operaciones de administración",
        services: ["listUsers", "updateRole", "getAuditLog"],
      },
    ],
    middleware: ["withAuth", "withRole", "withRateLimit"],
  };
}

export function formatBackendSummary(backend: BackendModules): string {
  return `${backend.modules.length} módulos · runtime ${backend.runtime}`;
}
