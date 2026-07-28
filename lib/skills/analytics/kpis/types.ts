/** Analytics KPIs analytics skill — module config (RC4.6). */

import type { AnalyticsProviderDef } from "../types";

export const KPIS_DEF: AnalyticsProviderDef = {
  domain: "kpis",
  skillId: "analytics-kpis",
  name: "Analytics KPIs",
  category: "analytics",
  provider: "forgeos-analytics",
  capability: "kpi_ops",
  risks: ["data_exposure", "mock_only"],
  actions: [
  { id: "define", label: "Define KPI", description: "Define a new KPI metric", risk: "medium" as const },
  { id: "track", label: "Track KPI", description: "Track KPI performance over time", risk: "low" as const },
  { id: "alert", label: "KPI Alert", description: "Configure KPI threshold alerts", risk: "medium" as const },
  { id: "benchmark", label: "Benchmark KPI", description: "Benchmark KPI against targets", risk: "low" as const },
  ],
};

export type KPISAction = (typeof KPIS_DEF.actions)[number]["id"];
