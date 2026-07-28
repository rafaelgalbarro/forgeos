/** Analytics Forecast analytics skill — module config (RC4.6). */

import type { AnalyticsProviderDef } from "../types";

export const FORECAST_DEF: AnalyticsProviderDef = {
  domain: "forecast",
  skillId: "analytics-forecast",
  name: "Analytics Forecast",
  category: "analytics",
  provider: "forgeos-analytics",
  capability: "forecast_ops",
  risks: ["data_exposure", "mock_only"],
  actions: [
  { id: "models", label: "Forecast Models", description: "Manage forecast models", risk: "high" as const },
  { id: "scenarios", label: "Forecast Scenarios", description: "Run forecast scenarios", risk: "medium" as const },
  { id: "projections", label: "Forecast Projections", description: "Generate projection outputs", risk: "medium" as const },
  ],
};

export type FORECASTAction = (typeof FORECAST_DEF.actions)[number]["id"];
