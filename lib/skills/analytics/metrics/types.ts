/** Analytics Metrics analytics skill — module config (RC4.6). */

import type { AnalyticsProviderDef } from "../types";

export const METRICS_DEF: AnalyticsProviderDef = {
  domain: "metrics",
  skillId: "analytics-metrics",
  name: "Analytics Metrics",
  category: "analytics",
  provider: "forgeos-analytics",
  capability: "metric_ops",
  risks: ["data_exposure", "mock_only"],
  actions: [
  { id: "collect", label: "Collect Metrics", description: "Collect raw metric data points", risk: "low" as const },
  { id: "aggregate", label: "Aggregate Metrics", description: "Aggregate metrics over intervals", risk: "low" as const },
  { id: "query", label: "Query Metrics", description: "Query metric time series", risk: "low" as const },
  { id: "visualize", label: "Visualize Metrics", description: "Visualize metric data", risk: "medium" as const },
  ],
};

export type METRICSAction = (typeof METRICS_DEF.actions)[number]["id"];
