/** Analytics Reports analytics skill — module config (RC4.6). */

import type { AnalyticsProviderDef } from "../types";

export const REPORTS_DEF: AnalyticsProviderDef = {
  domain: "reports",
  skillId: "analytics-reports",
  name: "Analytics Reports",
  category: "analytics",
  provider: "forgeos-analytics",
  capability: "report_ops",
  risks: ["data_exposure", "mock_only"],
  actions: [
  { id: "generate", label: "Generate Report", description: "Generate analytics report", risk: "medium" as const },
  { id: "schedule", label: "Schedule Report", description: "Schedule recurring report", risk: "medium" as const },
  { id: "export", label: "Export Report", description: "Export report to file format", risk: "low" as const },
  { id: "distribute", label: "Distribute Report", description: "Distribute report to recipients", risk: "high" as const },
  ],
};

export type REPORTSAction = (typeof REPORTS_DEF.actions)[number]["id"];
