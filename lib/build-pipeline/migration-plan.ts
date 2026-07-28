/** ForgeOS Build Pipeline — migration plan generator. */

import type { BuildFlowDryRunResult } from "@/lib/real-build-flow/types";
import type { MigrationPlan, PipelineMode } from "./types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function generateMigrationPlan(
  dryRun: BuildFlowDryRunResult,
  mode: PipelineMode
): MigrationPlan {
  const ventureName = dryRun.venture.name;
  const projectName = `${slugify(ventureName)}-sandbox`;
  const dbStack = dryRun.buildDna.stack.database;

  const migrations: MigrationPlan["migrations"] = [
    {
      order: 1,
      file: "001_init.sql",
      description: `Esquema inicial — ${dbStack}`,
      reversible: false,
    },
    {
      order: 2,
      file: "002_rls.sql",
      description: "Políticas RLS para tablas core",
      reversible: true,
    },
    {
      order: 3,
      file: "003_seed.sql",
      description: "Datos semilla sandbox (no producción)",
      reversible: true,
    },
  ];

  return {
    planId: `mig-${dryRun.flowId}`,
    provider: "supabase",
    environment: "sandbox",
    migrations,
    mode,
    summary: `Plan de migración sandbox para ${projectName} — ${migrations.length} archivos (solo preview)`,
  };
}
