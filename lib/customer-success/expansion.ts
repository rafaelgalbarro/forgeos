import type { ExpansionMetrics } from "./types";
import { getJourneyFunnel } from "@/lib/design-partners/journey-tracker";
import { listFeatureRequests } from "@/lib/design-partners/feature-requests";

export function getExpansionMetrics(): ExpansionMetrics {
  const funnel = getJourneyFunnel();
  const venture = funnel.find((s) => s.stage === "venture")?.count ?? 0;
  const analytics = funnel.find((s) => s.stage === "analytics")?.count ?? 0;
  const totalWorkspaces = Math.max(venture, 1);
  const upgradedWorkspaces = analytics;
  const upsellSignals = listFeatureRequests().filter((f) => f.priority === "high").length;

  return {
    rate: Math.round((upgradedWorkspaces / totalWorkspaces) * 100),
    upgradedWorkspaces,
    totalWorkspaces: venture,
    upsellSignals,
  };
}
