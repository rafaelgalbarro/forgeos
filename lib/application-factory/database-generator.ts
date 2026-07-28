/** Program 4500 — Database schema generator (Supabase-oriented). */

import type { DatabaseSchema, PRD } from "./types";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function generateDatabaseSchema(name: string, prd: PRD): DatabaseSchema {
  const entity = slugify(name.split(" ")[0] || "item");

  return {
    provider: "supabase",
    tables: [
      {
        name: "profiles",
        description: "Perfiles de usuario extendidos",
        columns: [
          { name: "id", type: "uuid", nullable: false, primary: true },
          { name: "email", type: "text", nullable: false },
          { name: "full_name", type: "text", nullable: true },
          { name: "role", type: "text", nullable: false },
          { name: "created_at", type: "timestamptz", nullable: false },
        ],
        rls: true,
      },
      {
        name: `${entity}s`,
        description: `Entidad principal de ${name}`,
        columns: [
          { name: "id", type: "uuid", nullable: false, primary: true },
          { name: "title", type: "text", nullable: false },
          { name: "description", type: "text", nullable: true },
          { name: "status", type: "text", nullable: false },
          { name: "owner_id", type: "uuid", nullable: false },
          { name: "created_at", type: "timestamptz", nullable: false },
          { name: "updated_at", type: "timestamptz", nullable: false },
        ],
        rls: true,
      },
      {
        name: "audit_log",
        description: "Registro de auditoría",
        columns: [
          { name: "id", type: "uuid", nullable: false, primary: true },
          { name: "action", type: "text", nullable: false },
          { name: "entity_type", type: "text", nullable: false },
          { name: "entity_id", type: "uuid", nullable: true },
          { name: "user_id", type: "uuid", nullable: false },
          { name: "created_at", type: "timestamptz", nullable: false },
        ],
        rls: true,
      },
    ],
    migrations: [
      "001_create_profiles.sql",
      `002_create_${entity}s.sql`,
      "003_create_audit_log.sql",
      "004_enable_rls_policies.sql",
    ],
    seedData: ["seed_profiles.sql", `seed_${entity}s.sql`],
  };
}

export function formatDatabaseSummary(schema: DatabaseSchema): string {
  return `${schema.tables.length} tablas · ${schema.migrations.length} migraciones · RLS activo`;
}
