/** Program 4500 — REST/API routes scaffold generator. */

import type { APIRoutes, DatabaseSchema } from "./types";

function entityFromSchema(schema: DatabaseSchema): string {
  const main = schema.tables.find((t) => !["profiles", "audit_log"].includes(t.name));
  return main?.name ?? "items";
}

export function generateAPIRoutes(name: string, schema: DatabaseSchema): APIRoutes {
  const entity = entityFromSchema(schema);

  return {
    basePath: "/api",
    routes: [
      { method: "GET", path: `/api/${entity}`, description: `Listar ${entity}`, auth: true, handler: `app/api/${entity}/route.ts` },
      { method: "POST", path: `/api/${entity}`, description: `Crear ${entity.slice(0, -1)}`, auth: true, handler: `app/api/${entity}/route.ts` },
      { method: "GET", path: `/api/${entity}/[id]`, description: "Obtener por ID", auth: true, handler: `app/api/${entity}/[id]/route.ts` },
      { method: "PUT", path: `/api/${entity}/[id]`, description: "Actualizar", auth: true, handler: `app/api/${entity}/[id]/route.ts` },
      { method: "DELETE", path: `/api/${entity}/[id]`, description: "Eliminar", auth: true, handler: `app/api/${entity}/[id]/route.ts` },
      { method: "GET", path: "/api/dashboard/stats", description: "Métricas del dashboard", auth: true, handler: "app/api/dashboard/stats/route.ts" },
      { method: "GET", path: "/api/admin/users", description: "Listar usuarios (admin)", auth: true, handler: "app/api/admin/users/route.ts" },
    ],
    middleware: ["auth-middleware.ts", "rate-limit.ts", "cors.ts"],
  };
}

export function formatAPISummary(api: APIRoutes): string {
  return `${api.routes.length} rutas · ${api.middleware.length} middleware`;
}
