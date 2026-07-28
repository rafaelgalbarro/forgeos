/** Program 9000 — Network dashboard data builder. */

import type { IntelligenceNetworkSnapshot, NetworkDashboardData } from "./types";
import { DEMO_DISCLAIMER } from "./types";

export function buildNetworkDashboard(snapshot: IntelligenceNetworkSnapshot): NetworkDashboardData {
  const privacyStatus = snapshot.canContribute
    ? ("contributing" as const)
    : snapshot.networkEnabled
      ? ("read-only" as const)
      : ("isolated" as const);

  return {
    kpis: [
      { label: "Crecimiento sector", value: `${snapshot.benchmarks.growthRatePct}%`, delta: 21 },
      { label: "Ventures en red", value: String(snapshot.benchmarks.sampleSize) },
      { label: "Señales activas", value: String(snapshot.marketSignals.length), delta: 4 },
      { label: "Oportunidades", value: String(snapshot.opportunities.length), delta: 14 },
      { label: "Playbooks", value: String(snapshot.playbooks.length) },
      { label: "Patrones detectados", value: String(snapshot.patterns.length) },
    ],
    sections: [
      { id: "benchmarks", title: "Benchmarks", count: snapshot.benchmarks.metrics.length },
      { id: "signals", title: "Señales", count: snapshot.marketSignals.length },
      { id: "trends", title: "Tendencias", count: snapshot.industryTrends.length },
      { id: "playbooks", title: "Playbooks", count: snapshot.playbooks.length },
      { id: "insights", title: "Insights", count: snapshot.executiveInsights.length },
      { id: "opportunities", title: "Oportunidades", count: snapshot.opportunities.length },
    ],
    privacyStatus,
    disclaimer: DEMO_DISCLAIMER,
  };
}
