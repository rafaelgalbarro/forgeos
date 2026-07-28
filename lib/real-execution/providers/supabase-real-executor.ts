/** ForgeOS RC5.3 — Supabase controlled real executor. */

import {
  isSupabaseConfigured,
  listSupabaseProjects,
  validateSupabaseConnection,
} from "@/lib/connections/supabase/client";
import { canExecuteProviderReal } from "@/lib/real-build-flow/execution-flags";
import { normalizeProviderResult } from "./provider-result-normalizer";
import type { NormalizedProviderResult } from "./provider-result-normalizer";

export interface SupabaseRealExecutionInput {
  ventureName: string;
  approved: boolean;
}

export async function executeSupabaseControlledReal(
  input: SupabaseRealExecutionInput
): Promise<{ results: NormalizedProviderResult[]; rollbackSteps: string[] }> {
  const rollbackSteps = [
    "Discard pending sandbox migrations",
    "Do not apply to production database",
  ];

  const migrationPlan = ["001_init.sql", "002_seed.sql"];

  if (!canExecuteProviderReal("supabase") || !input.approved) {
    return {
      results: [
        normalizeProviderResult({
          provider: "supabase",
          success: true,
          executed: false,
          mode: "dry_run",
          output: "[DRY-RUN] Supabase sandbox migration plan prepared",
          data: { migrations: migrationPlan },
          rollbackSteps,
        }),
      ],
      rollbackSteps,
    };
  }

  if (!isSupabaseConfigured()) {
    return {
      results: [
        normalizeProviderResult({
          provider: "supabase",
          success: false,
          executed: false,
          mode: "sandbox",
          output: "SUPABASE_ACCESS_TOKEN not configured",
          errors: ["Missing credential"],
          rollbackSteps,
        }),
      ],
      rollbackSteps,
    };
  }

  try {
    await validateSupabaseConnection();
    const projects = await listSupabaseProjects();

    return {
      results: [
        normalizeProviderResult({
          provider: "supabase",
          success: true,
          executed: false,
          mode: "sandbox",
          output: `Token valid. ${projects.length} project(s). Sandbox migration plan ready.`,
          data: {
            projectCount: projects.length,
            migrationPlan,
            sandboxProjectName: `${input.ventureName}-sandbox`.toLowerCase().replace(/\s+/g, "-"),
          },
          warnings: ["No production table changes in RC5.3"],
          rollbackSteps,
        }),
      ],
      rollbackSteps,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Supabase validation failed";
    return {
      results: [
        normalizeProviderResult({
          provider: "supabase",
          success: false,
          executed: false,
          mode: "sandbox",
          output: msg,
          errors: [msg],
          rollbackSteps,
        }),
      ],
      rollbackSteps,
    };
  }
}
