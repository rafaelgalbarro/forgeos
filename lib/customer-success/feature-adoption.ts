import type { FeatureAdoptionMetric } from "./types";
import { listDesignPartnerEvents } from "@/lib/design-partners/analytics";
import { getJourneyFunnel } from "@/lib/design-partners/journey-tracker";

const FEATURE_LABELS: Record<string, string> = {
  dp_page_view: "Navegación",
  dp_journey_stage: "Journey",
  dp_feedback_view: "Feedback",
  dp_roadmap_vote: "Roadmap",
  dp_feature_request: "Ideas",
  dp_issue_report: "Issues",
  dp_nps_submit: "NPS",
  dp_dashboard_view: "Dashboard DP",
  dp_executive_report_view: "Informes ejecutivos",
};

export function getFeatureAdoptionMetrics(): FeatureAdoptionMetric[] {
  const events = listDesignPartnerEvents();
  const funnel = getJourneyFunnel();
  const totalUsers = Math.max(funnel.find((s) => s.stage === "landing")?.count ?? 1, 1);

  const eventCounts = new Map<string, number>();
  for (const e of events) {
    eventCounts.set(e.event, (eventCounts.get(e.event) ?? 0) + 1);
  }

  return Array.from(eventCounts.entries())
    .map(([event, adopters]) => ({
      feature: FEATURE_LABELS[event] ?? event,
      adopters,
      totalUsers,
      adoptionRate: Math.round((adopters / totalUsers) * 100),
      trend: adopters > 5 ? ("up" as const) : adopters > 0 ? ("stable" as const) : ("down" as const),
    }))
    .sort((a, b) => b.adoptionRate - a.adoptionRate);
}
