/** Analytics Predictions analytics skill — module config (RC4.6). */

import type { AnalyticsProviderDef } from "../types";

export const PREDICTIONS_DEF: AnalyticsProviderDef = {
  domain: "predictions",
  skillId: "analytics-predictions",
  name: "Analytics Predictions",
  category: "analytics",
  provider: "forgeos-analytics",
  capability: "prediction_ops",
  risks: ["data_exposure", "mock_only"],
  actions: [
  { id: "ml_insights", label: "ML Insights", description: "Generate ML-driven insights", risk: "high" as const },
  { id: "trends", label: "Trend Analysis", description: "Analyze trends in data", risk: "medium" as const },
  { id: "anomalies", label: "Anomaly Detection", description: "Detect data anomalies", risk: "medium" as const },
  ],
};

export type PREDICTIONSAction = (typeof PREDICTIONS_DEF.actions)[number]["id"];
