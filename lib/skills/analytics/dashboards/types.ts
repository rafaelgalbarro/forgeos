/** Analytics Dashboards analytics skill — module config (RC4.6). */

import type { AnalyticsProviderDef } from "../types";

export const DASHBOARDS_DEF: AnalyticsProviderDef = {
  domain: "dashboards",
  skillId: "analytics-dashboards",
  name: "Analytics Dashboards",
  category: "analytics",
  provider: "forgeos-analytics",
  capability: "dashboard_ops",
  risks: ["data_exposure", "mock_only"],
  actions: [
  { id: "create", label: "Create Dashboard", description: "Create a new analytics dashboard", risk: "medium" as const },
  { id: "widgets", label: "Manage Widgets", description: "Add or update dashboard widgets", risk: "medium" as const },
  { id: "share", label: "Share Dashboard", description: "Share dashboard with stakeholders", risk: "medium" as const },
  { id: "refresh", label: "Refresh Dashboard", description: "Refresh dashboard data", risk: "low" as const },
  ],
};

export type DASHBOARDSAction = (typeof DASHBOARDS_DEF.actions)[number]["id"];
