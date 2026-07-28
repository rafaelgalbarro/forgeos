import type { SupportMetrics } from "./types";
import { getIssueCount, listIssueReports } from "@/lib/design-partners/issue-reporting";
import { listFeedbackInbox } from "@/lib/design-partners/feedback-center";

/** Stub — métricas de soporte derivadas de issues y feedback local */
export function getSupportMetrics(): SupportMetrics {
  const issues = listIssueReports();
  const openTickets = issues.filter((i) => i.status === "open" || i.status === "triaged" || i.status === "in-progress").length;
  const resolvedTickets = issues.filter((i) => i.status === "resolved" || i.status === "closed").length;
  const feedback = listFeedbackInbox();
  const ratings = feedback.filter((f) => f.rating != null).map((f) => f.rating!);
  const satisfactionScore =
    ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 7.5;

  return {
    openTickets: openTickets || Math.max(0, getIssueCount() - resolvedTickets),
    resolvedTickets,
    avgResolutionHours: resolvedTickets > 0 ? 18 : 0,
    satisfactionScore,
  };
}
