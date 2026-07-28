/** Supabase cloud skill — module config (RC4.2). */

import type { ProviderModuleConfig } from "@/lib/skills/shared/provider-factory";

export const SUPABASE_CONFIG: ProviderModuleConfig = {
  id: "supabase",
  name: "Supabase",
  category: "database",
  provider: "supabase",
  capability: "database_ops",
  credential: "SUPABASE_KEY",
  risks: ["external_api", "data_change"],
  actions: [
    { id: "create_project", name: "Create Project", risk: "HIGH" },
    { id: "run_migration", name: "Run Migration", risk: "HIGH" },
    { id: "query_table", name: "Query Table", risk: "LOW" },
    { id: "create_table", name: "Create Table", risk: "MEDIUM" },
    { id: "get_project_status", name: "Get Project Status", risk: "LOW" },
  ],
  mockData: (action, ctx) => ({
    provider: "supabase",
    action,
    ventureId: ctx.ventureId,
    project: `sb-${ctx.ventureId}`,
    rows: action.includes("query") ? [{ id: 1, name: "mock-row" }] : undefined,
    sandbox: true,
  }),
};

export type SupabaseAction = (typeof SUPABASE_CONFIG.actions)[number]["id"];
